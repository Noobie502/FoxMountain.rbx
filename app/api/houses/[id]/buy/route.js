import { NextResponse } from "next/server";
import { currentUsername, publicAccount } from "@/lib/auth";
import { addHistory, fail, handleError } from "@/lib/api";
import { publicHouse } from "@/lib/houses";
import { DIAMONDS_PER_EMERALD, formatBalance } from "@/lib/money";
import { getAccount, getHouse, saveAccount, saveHouse, withAccountLocks } from "@/lib/store";

// Buy a property. Players only. The price leaves the buyer's account (the
// bank is the seller) and the listing is marked as sold to them.
export async function POST(_req, { params }) {
  const me = await currentUsername();
  if (!me) return fail("Sign in with a player account to buy a property.", 401);

  try {
    const { id } = await params;
    // Lock both the buyer and the house so two people can't buy it at once.
    return await withAccountLocks([me, `house:${id}`], async () => {
      const house = await getHouse(id);
      if (!house) return fail("That listing no longer exists.", 404);
      if (house.status === "sold") {
        return fail(house.owner?.toLowerCase() === me ? "You already own this property." : "Someone else just bought this property.", 409);
      }

      const buyer = await getAccount(me);
      if (!buyer) return fail("Your account no longer exists.", 404);
      if (buyer.balanceDiamonds < house.priceDiamonds) {
        return fail(`This costs ${formatBalance(house.priceDiamonds)} and you have ${formatBalance(buyer.balanceDiamonds)}.`);
      }

      buyer.balanceDiamonds -= house.priceDiamonds;
      const even = house.priceDiamonds % DIAMONDS_PER_EMERALD === 0;
      addHistory(buyer, {
        type: "house-purchase",
        amount: even ? house.priceDiamonds / DIAMONDS_PER_EMERALD : house.priceDiamonds,
        unit: even ? "emeralds" : "diamonds",
        deltaDiamonds: -house.priceDiamonds,
        counterparty: house.address,
      });
      house.status = "sold";
      house.owner = buyer.username;
      house.soldAt = new Date().toISOString();

      await saveAccount(buyer);
      await saveHouse(house);
      return NextResponse.json({ house: publicHouse(house), account: publicAccount(buyer) });
    });
  } catch (err) {
    return handleError(err, "The purchase didn't go through. Try again.");
  }
}
