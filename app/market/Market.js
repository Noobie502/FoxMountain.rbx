"use client";

import { useRef, useState } from "react";
import { formatBalance, toDiamonds } from "@/lib/money";
import { Gem } from "../Emerald";

const nf = (n) => n.toLocaleString("en-US");

const isMine = (house, viewer) => house.owner && viewer.username && house.owner.toLowerCase() === viewer.username.toLowerCase();

export default function Market({ initialHouses, canList, viewer }) {
  const [houses, setHouses] = useState(initialHouses);
  const [balance, setBalance] = useState(viewer.balanceDiamonds);
  const forSale = houses.filter((h) => h.status !== "sold");
  const sold = houses.filter((h) => h.status === "sold");
  const ordered = [...forSale, ...sold];
  const [formOpen, setFormOpen] = useState(false);
  const [notice, setNotice] = useState("");

  return (
    <main className="market">
      <header className="market-head">
        <div>
          <p className="eyebrow">Housing market</p>
          <h1 className="page-title">
            {forSale.length === 0
              ? "No properties for sale"
              : `${nf(forSale.length)} ${forSale.length === 1 ? "property" : "properties"} for sale`}
          </h1>
        </div>
        {viewer.role === "player" && (
          <p className="market-balance">
            <span className="muted">Your balance</span>
            <strong>{formatBalance(balance)}</strong>
          </p>
        )}
        {canList && !formOpen && (
          <button type="button" className="primary" onClick={() => { setFormOpen(true); setNotice(""); }}>
            List a property
          </button>
        )}
      </header>

      {notice && (
        <p className="success" role="status">
          {notice}
        </p>
      )}

      {canList && formOpen && (
        <ListingForm
          onCancel={() => setFormOpen(false)}
          onPosted={(house) => {
            setHouses((list) => [house, ...list]);
            setFormOpen(false);
            setNotice(`Listed ${house.address}.`);
          }}
        />
      )}

      {houses.length === 0 ? (
        <section className="market-empty">
          <p>
            {canList
              ? "Use “List a property” to post the first house. Each listing needs a picture, bedrooms, bathrooms, square feet, an address and a price."
              : "Houses the developer puts up for sale will appear here."}
          </p>
        </section>
      ) : (
        <ul className="house-grid">
          {ordered.map((h) => (
            <HouseCard
              key={h.id}
              house={h}
              viewer={viewer}
              balance={balance}
              onBought={(house, account) => {
                setHouses((list) => list.map((x) => (x.id === house.id ? house : x)));
                setBalance(account.balanceDiamonds);
                setNotice(`You bought ${house.address}. It's yours.`);
              }}
              canRemove={canList}
              onRemoved={() => {
                setHouses((list) => list.filter((x) => x.id !== h.id));
                setNotice(`Removed ${h.address}.`);
              }}
            />
          ))}
        </ul>
      )}
    </main>
  );
}

function BuyBox({ house, balance, onBought }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const short = house.priceDiamonds - balance;

  async function buy() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/houses/${house.id}/buy`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "The purchase didn't go through.");
      onBought(data.house, data.account);
    } catch (err) {
      setError(err.message);
      setBusy(false);
      setConfirming(false);
    }
  }

  if (short > 0) {
    return (
      <div className="buy-box">
        <button type="button" className="primary" disabled>
          Buy
        </button>
        <p className="hint">You need {formatBalance(short)} more.</p>
      </div>
    );
  }

  return (
    <div className="buy-box">
      {!confirming ? (
        <button type="button" className="primary" onClick={() => setConfirming(true)}>
          Buy
        </button>
      ) : (
        <div className="buy-confirm">
          <p>
            Pay <strong>{formatBalance(house.priceDiamonds)}</strong>? You'll have {formatBalance(balance - house.priceDiamonds)} left.
          </p>
          <div className="adjust-actions">
            <button type="button" className="ghost" onClick={() => setConfirming(false)} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="primary" onClick={buy} disabled={busy}>
              {busy ? "Buying…" : "Confirm purchase"}
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function HouseCard({ house, viewer, balance, onBought, canRemove, onRemoved }) {
  const sold = house.status === "sold";
  const mine = isMine(house, viewer);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/houses/${house.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 404) throw new Error(data.error || "Couldn't remove the listing.");
      onRemoved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <li className={`house ${sold ? "house-sold" : ""}`}>
      <div className="house-photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={house.imageUrl} alt={`Picture of ${house.address}`} loading="lazy" />
        <span className={`house-status ${sold ? (mine ? "status-mine" : "status-sold") : ""}`}>
          {sold ? (mine ? "Yours" : "Sold") : "For sale"}
        </span>
      </div>
      <div className="house-body">
        <p className="house-price">
          <Gem kind="emerald" size={20} />
          {formatBalance(house.priceDiamonds)}
        </p>
        <ul className="house-stats" aria-label="Property details">
          <li>
            <strong>{nf(house.bedrooms)}</strong> {house.bedrooms === 1 ? "bed" : "beds"}
          </li>
          <li>
            <strong>{nf(house.bathrooms)}</strong> {house.bathrooms === 1 ? "bath" : "baths"}
          </li>
          <li>
            <strong>{nf(house.squareFeet)}</strong> sq ft
          </li>
        </ul>
        <p className="house-address">{house.address}</p>
        {sold && (
          <p className="house-owner">{mine ? "You own this property." : `Owned by ${house.owner}`}</p>
        )}
        {!sold && viewer.role === "player" && <BuyBox house={house} balance={balance} onBought={onBought} />}
        {canRemove && (
          <div className="house-admin">
            {!confirming ? (
              <button type="button" className="text-danger" onClick={() => setConfirming(true)}>
                Remove listing
              </button>
            ) : (
              <div className="house-confirm">
                <span>{sold ? `Remove? ${house.owner} will lose it.` : "Remove this listing?"}</span>
                <button type="button" className="ghost ghost-sm" onClick={() => setConfirming(false)} disabled={busy}>
                  Keep
                </button>
                <button type="button" className="danger danger-solid danger-sm" onClick={remove} disabled={busy}>
                  {busy ? "Removing…" : "Remove"}
                </button>
              </div>
            )}
            {error && <p className="error">{error}</p>}
          </div>
        )}
      </div>
    </li>
  );
}

// Shrinks a photo to at most 1280px on the long side and re-encodes it as JPEG,
// lowering quality until it fits under ~600 KB.
async function compressImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("That file isn't a picture we can read. Try a JPEG or PNG."));
      el.src = url;
    });
    const scale = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.85, 0.75, 0.65, 0.5, 0.4]) {
      const data = canvas.toDataURL("image/jpeg", quality);
      if ((data.length * 3) / 4 < 600 * 1024) return data;
    }
    throw new Error("That picture is too detailed to upload. Try a smaller one.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function ListingForm({ onCancel, onPosted }) {
  const fileInput = useRef(null);
  const [image, setImage] = useState(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [f, setF] = useState({ bedrooms: "", bathrooms: "", squareFeet: "", address: "", price: "", priceUnit: "emeralds" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setF((v) => ({ ...v, [key]: e.target.value }));
  const digits = (key, max = 7) => (e) => setF((v) => ({ ...v, [key]: e.target.value.replace(/[^0-9]/g, "").slice(0, max) }));

  async function pick(file) {
    if (!file) return;
    setError("");
    setImageBusy(true);
    try {
      setImage(await compressImage(file));
    } catch (err) {
      setError(err.message);
    } finally {
      setImageBusy(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!image) return setError("Add a picture of the property.");
    for (const [key, label] of [["bedrooms", "bedrooms"], ["bathrooms", "bathrooms"], ["squareFeet", "square feet"], ["address", "the address"], ["price", "the price"]]) {
      if (String(f[key]).trim() === "") return setError(`Fill in ${label}.`);
    }
    setBusy(true);
    try {
      const res = await fetch("/api/houses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...f,
          bedrooms: Number(f.bedrooms),
          bathrooms: Number(f.bathrooms),
          squareFeet: Number(f.squareFeet),
          price: Number(f.price),
          image,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't post the listing.");
      onPosted(data.house);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  const priceOk = Number.isInteger(Number(f.price)) && Number(f.price) > 0;

  return (
    <form className="listing-form" onSubmit={submit} noValidate>
      <h2 className="listing-title">List a property</h2>
      <div className="listing-grid">
        <div className="field">
          <span className="label-like">Picture</span>
          <button
            type="button"
            className={`photo-drop ${image ? "has-photo" : ""}`}
            onClick={() => fileInput.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              pick(e.dataTransfer.files?.[0]);
            }}
          >
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="Preview of the property picture" />
            ) : (
              <span>{imageBusy ? "Preparing picture…" : "Choose a picture or drop it here"}</span>
            )}
          </button>
          {image && (
            <button type="button" className="dev-link" style={{ justifySelf: "start" }} onClick={() => fileInput.current?.click()}>
              Change picture
            </button>
          )}
          <input
            ref={fileInput}
            id="listing-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(e) => {
              pick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>

        <div className="listing-fields">
          <div className="field-row">
            <div className="field">
              <label htmlFor="listing-bedrooms">Bedrooms</label>
              <input id="listing-bedrooms" inputMode="numeric" value={f.bedrooms} onChange={digits("bedrooms", 2)} placeholder="3" />
            </div>
            <div className="field">
              <label htmlFor="listing-bathrooms">Bathrooms</label>
              <input
                id="listing-bathrooms"
                inputMode="decimal"
                value={f.bathrooms}
                onChange={(e) => setF((v) => ({ ...v, bathrooms: e.target.value.replace(/[^0-9.]/g, "").slice(0, 4) }))}
                placeholder="2"
              />
            </div>
            <div className="field">
              <label htmlFor="listing-sqft">Square feet</label>
              <input id="listing-sqft" inputMode="numeric" value={f.squareFeet} onChange={digits("squareFeet")} placeholder="1450" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="listing-address">Address</label>
            <input id="listing-address" value={f.address} maxLength={120} onChange={set("address")} placeholder="12 Birch Lane, Spawn Town" />
          </div>
          <div className="field">
            <span className="label-like">Price</span>
            <div className="adjust-row">
              <label htmlFor="listing-price" className="sr-only">
                Price
              </label>
              <input id="listing-price" inputMode="numeric" value={f.price} onChange={digits("price")} placeholder="Amount" />
              <div className="unit-toggle" role="radiogroup" aria-label="Price currency">
                {["emeralds", "diamonds"].map((u) => (
                  <button
                    key={u}
                    type="button"
                    role="radio"
                    aria-checked={f.priceUnit === u}
                    className="unit"
                    onClick={() => setF((v) => ({ ...v, priceUnit: u }))}
                  >
                    {u === "emeralds" ? "Emeralds" : "Diamonds"}
                  </button>
                ))}
              </div>
            </div>
            {priceOk && <p className="hint">Listed at {formatBalance(toDiamonds(Number(f.price), f.priceUnit))}.</p>}
          </div>
        </div>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="listing-actions">
        <button type="button" className="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className="primary" disabled={busy || imageBusy}>
          {busy ? "Posting…" : "Post listing"}
        </button>
      </div>
    </form>
  );
}
