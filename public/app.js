(function(){
  "use strict";

  var MARK_SVG = '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<path d="M3 29L13 12L19 22L24 14L37 29H3Z" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M28 9L31 4L34 9" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linejoin="round"/>' +
    '<circle cx="31" cy="9" r="1.6" fill="var(--gold)"/>' +
    '</svg>';

  var EMPTY_CARS_SVG = '<svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<path d="M8 27l2.8-8.5A3 3 0 0 1 13.6 16h16.8a3 3 0 0 1 2.8 2.5L36 27" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' +
    '<rect x="6" y="27" width="32" height="7" rx="2" stroke="currentColor" stroke-width="1.6"/>' +
    '<circle cx="14" cy="34" r="2.4" fill="currentColor"/><circle cx="30" cy="34" r="2.4" fill="currentColor"/></svg>';

  var EMPTY_HOUSES_SVG = '<svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<path d="M7 21L22 8l15 13" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>' +
    '<path d="M11 18v16a1.5 1.5 0 0 0 1.5 1.5H31.5A1.5 1.5 0 0 0 33 34V18" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' +
    '<rect x="19" y="24.5" width="6" height="11" stroke="currentColor" stroke-width="1.6"/></svg>';

  var TYPE_LABEL = {checking:"Checking", savings:"Savings", business:"Business"};

  var JOBS = [
    {id:"fm-banker", title:"Fox Mountain Banker", pay:450, qualification:"Banking degree"},
    {id:"doctor", title:"Doctor", pay:600, qualification:"Medical degree"},
    {id:"connors-worker", title:"Connors' Worker", pay:75, qualification:null},
    {id:"burgerhaus-worker", title:"Burgerhaus Worker", pay:80, qualification:null},
    {id:"leos-diner-worker", title:"Leo's Diner Worker", pay:100, qualification:null},
    {id:"airport-employee", title:"Airport Employee", pay:190, qualification:null},
    {id:"roadmap-dealership-worker", title:"Roadmap Dealership Worker", pay:125, qualification:null},
    {id:"park-ranger", title:"Park Ranger", pay:230, qualification:null},
    {id:"paramedic", title:"Paramedic", pay:200, qualification:null},
    {id:"firefighter", title:"Firefighter", pay:175, qualification:null},
    {id:"police-officer", title:"Police Officer", pay:235, qualification:"Police school qualification"},
    {id:"taxi-driver", title:"Taxi Driver", pay:160, qualification:null},
    {id:"house-retailer", title:"House Retailer", pay:300, qualification:null},
    {id:"cashier", title:"Cashier", pay:75, qualification:null},
    {id:"sahara-delivery-driver", title:"Sahara Delivery Driver", pay:160, qualification:null},
    {id:"post-office-delivery", title:"Post Office Delivery", pay:200, qualification:null},
    {id:"school-teacher", title:"School Teacher", pay:290, qualification:null}
  ];
  var JOBS_BY_ID = {};
  JOBS.forEach(function(j){ JOBS_BY_ID[j.id] = j; });

  /* ---------------- state ---------------- */
  // `state` is the shared, server-backed data (accounts/cars/houses) — kept
  // in sync with the /api/state endpoint. `ui` is purely local, per-tab
  // ephemeral state (open forms, drafts, error messages) and is never sent
  // to the server as a whole, only the pieces of `state` that actually
  // changed.
  var state = {accounts:[], cars:[], houses:[]};
  var local = readLocal();
  var ui = neutralUi();
  var loaded = false; // true once the first GET /api/state has resolved

  function neutralUi(){
    return {
      pendingRemoveId: null,
      pendingJobConfirmId: null,
      jobFilter: {query:"", qual:"all"},
      formError: "",
      accountFormOpen: false,

      pendingCarRemoveId: null,
      pendingCarPhoto: null,
      carFormError: "",
      carDraft: {title:"", price:"", mileage:""},
      carFormOpen: false,

      pendingHouseRemoveId: null,
      pendingHousePhoto: null,
      houseFormError: "",
      houseDraft: {address:"", price:"", owner:"", age:""},
      houseFormOpen: false,

      bankingTab: "transfer",
      transferDraft: {toAccountId:"", amount:""},
      adjustDraft: {amount:""},
      bankingError: "",
      bankingNotice: "",

      writable: true,
      publishing: false
    };
  }

  function readLocal(){
    try{
      var raw = localStorage.getItem("fm_local_v1");
      var parsed = raw ? JSON.parse(raw) : {};
      return {selectedAccountId: parsed.selectedAccountId || null};
    }catch(e){ return {selectedAccountId:null}; }
  }
  function saveLocal(){
    try{ localStorage.setItem("fm_local_v1", JSON.stringify(local)); }catch(e){}
  }

  function fmt(n){ return "$" + Math.round(Number(n)||0).toLocaleString("en-US"); }
  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]; }); }
  function genAccountNumber(){ return "FM-" + Math.floor(100000 + Math.random()*900000); }
  function genId(){ return "acc_" + Date.now().toString(36) + Math.random().toString(36).slice(2,8); }
  function genCarId(){ return "car_" + Date.now().toString(36) + Math.random().toString(36).slice(2,8); }
  function genHouseId(){ return "house_" + Date.now().toString(36) + Math.random().toString(36).slice(2,8); }
  function fmtPrecise(n){ return "$" + (Number(n)||0).toLocaleString("en-US", {minimumFractionDigits:2, maximumFractionDigits:2}); }
  function fmtInt(n){ return Math.round(Number(n)||0).toLocaleString("en-US"); }

  var SHIFT_MS = 20 * 60 * 1000; // 20 real minutes = one full day's wage

  /* ---------------- templates ---------------- */
  function headerTpl(accounts, cars, houses){
    var totalBalance = accounts.reduce(function(sum,a){ return sum + (Number(a.balance)||0); }, 0);
    var jobsFilled = accounts.filter(function(a){ return !!a.job; }).length;
    var onShiftCount = accounts.filter(function(a){ return !!a.onShift; }).length;
    return '' +
    '<header class="site-header">' +
      '<div class="brand">' + MARK_SVG +
        '<div class="brand-text">' +
          '<h1>FoxMountain<span class="ext">.rbx</span></h1>' +
          '<p>Player-run banking, jobs and vehicles for the FoxMountain server.</p>' +
        '</div>' +
      '</div>' +
      '<div class="stats">' +
        '<div class="stat-tile"><div class="label">Accounts open</div><div class="value mono">' + accounts.length + '</div></div>' +
        '<div class="stat-tile"><div class="label">On deposit</div><div class="value mono">' + fmt(totalBalance) + '</div></div>' +
        '<div class="stat-tile"><div class="label">Jobs filled</div><div class="value mono">' + jobsFilled + '</div></div>' +
        '<div class="stat-tile"><div class="label">On shift now</div><div class="value mono">' + onShiftCount + '</div></div>' +
        '<div class="stat-tile"><div class="label">Cars listed</div><div class="value mono">' + cars.length + '</div></div>' +
        '<div class="stat-tile"><div class="label">Houses listed</div><div class="value mono">' + houses.length + '</div></div>' +
      '</div>' +
    '</header>';
  }

  function sessionBannerTpl(selected){
    if (!selected){
      return '<div class="session-banner empty">No account chosen yet — open one below or choose an existing account to continue as them.</div>';
    }
    var job = selected.job ? JOBS_BY_ID[selected.job] : null;
    var jobLine;
    if (job && selected.onShift){
      jobLine = '<div class="who">Job<strong>' + esc(job.title) + '</strong>' +
        '<span class="shift-live" id="shift-ticker"><span class="shift-dot"></span>' + fmtPrecise(0) + ' earned this shift</span>' +
        '</div>';
    } else if (job){
      jobLine = '<div class="who">Job<strong>' + esc(job.title) + '</strong><span style="font-size:12.5px;color:var(--text-muted);">' + fmt(job.pay) + '/day &middot; not on shift</span></div>';
    } else {
      jobLine = '<div class="who">Job<strong style="font-family:inherit;font-weight:500;color:var(--text-muted);">Unemployed</strong></div>';
    }
    return '<div class="session-banner">' +
      '<div class="who">Viewing as<strong>' + esc(selected.holder) + '</strong></div>' +
      '<div class="who">' + TYPE_LABEL[selected.type] + ' &middot; <span class="mono">' + esc(selected.accountNumber) + '</span></div>' +
      jobLine +
      '<div class="bal mono">' + fmt(selected.balance) + '</div>' +
    '</div>';
  }

  function accountRowTpl(a, isSelected, isPendingRemove, ui){
    return '<div class="account-row' + (isSelected ? ' selected' : '') + '" data-account-id="' + esc(a.id) + '">' +
      '<div class="who">' +
        '<div class="holder">' + esc(a.holder) + '</div>' +
        '<div class="meta"><span class="dot ' + a.type + '"></span>' + TYPE_LABEL[a.type] + ' &middot; <span class="mono">' + esc(a.accountNumber) + '</span></div>' +
      '</div>' +
      '<div class="actions">' +
        (isSelected
          ? '<button type="button" class="btn btn-ghost btn-small" disabled>Selected</button>'
          : '<button type="button" class="btn btn-ghost btn-small" data-action="choose" data-id="' + esc(a.id) + '">Choose</button>') +
        (isPendingRemove
          ? '<button type="button" class="btn btn-danger btn-small" data-action="confirm-remove" data-id="' + esc(a.id) + '"' + (ui.publishing ? ' disabled' : '') + '>Confirm?</button>'
          : '<button type="button" class="btn-text" data-action="remove" data-id="' + esc(a.id) + '"' + (ui.publishing ? ' disabled' : '') + '>Remove</button>') +
      '</div>' +
    '</div>';
  }

  function accountsPanelTpl(accounts, selectedId, ui){
    var selected = accounts.filter(function(a){ return a.id === selectedId; })[0] || null;
    var list = accounts.length
      ? '<div class="account-list">' + accounts.map(function(a){ return accountRowTpl(a, a.id===selectedId, a.id===ui.pendingRemoveId, ui); }).join("") + '</div>'
      : '<div class="empty-accounts">No accounts have been opened on this server yet. Be the first — open one below.</div>';

    var notice = "";
    if (!ui.writable){
      notice = '<div class="notice warn">This view can’t save changes right now, so new accounts won’t be shared with other players. You can still browse.</div>';
    }

    return '' +
    '<section class="panel">' +
      '<div class="panel-head">' +
        '<div><h2>Bank Accounts</h2><div class="sub">Open an account or choose one to continue as</div></div>' +
      '</div>' +
      '<div class="panel-body">' +
        notice +
        sessionBannerTpl(selected) +
        list +
        '<details class="new-account" id="account-form-details"' + (ui.writable ? '' : ' style="display:none"') + (ui.accountFormOpen ? ' open' : '') + '>' +
          '<summary>Open a new account</summary>' +
          '<form data-form="create-account">' +
            '<div class="form-grid">' +
              '<div class="field"><label for="fld-holder">Player name</label><input id="fld-holder" name="holder" type="text" maxlength="40" placeholder="e.g. RustyGearFox" required></div>' +
              '<div class="field"><label for="fld-type">Account type</label>' +
                '<select id="fld-type" name="type">' +
                  '<option value="checking">Checking</option>' +
                  '<option value="savings">Savings</option>' +
                  '<option value="business">Business</option>' +
                '</select>' +
              '</div>' +
              '<div class="field"><label for="fld-balance">Starting balance</label><input id="fld-balance" name="balance" type="number" min="0" step="1" value="0"></div>' +
            '</div>' +
            (ui.formError ? '<div class="form-error">' + esc(ui.formError) + '</div>' : '') +
            '<div class="form-actions">' +
              '<button type="submit" class="btn btn-primary" ' + (ui.publishing ? 'disabled' : '') + '>' + (ui.publishing ? 'Opening…' : 'Open account') + '</button>' +
              '<span style="font-size:12.5px;color:var(--text-faint);">New accounts start with $0 unless you set a balance</span>' +
            '</div>' +
          '</form>' +
        '</details>' +
      '</div>' +
    '</section>';
  }

  function filteredJobs(filter){
    var q = filter.query.trim().toLowerCase();
    return JOBS.filter(function(j){
      if (filter.qual === "none" && j.qualification) return false;
      if (filter.qual === "required" && !j.qualification) return false;
      if (q && j.title.toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }

  function jobRowTpl(job, myAccount, ui){
    var isMine = myAccount && myAccount.job === job.id;
    var dis = ui.publishing ? ' disabled' : '';
    var action, shiftBadge = "";
    if (isMine){
      if (myAccount.onShift){
        shiftBadge = '<span class="shift-badge"><span class="shift-dot"></span>On shift</span>';
        action = '<button type="button" class="btn btn-danger btn-small" data-action="stop-shift"' + dis + '>Stop shift</button>' +
                 '<button type="button" class="btn-text" data-action="quit-job" data-id="' + job.id + '"' + dis + '>Quit</button>';
      } else {
        action = '<button type="button" class="btn btn-primary btn-small" data-action="start-shift"' + dis + '>Start shift</button>' +
                 '<button type="button" class="btn-text" data-action="quit-job" data-id="' + job.id + '"' + dis + '>Quit</button>';
      }
    } else if (ui.pendingJobConfirmId === job.id){
      action = '<button type="button" class="btn btn-primary btn-small" data-action="confirm-take-job" data-id="' + job.id + '"' + dis + '>Confirm hire</button>' +
               '<button type="button" class="btn-text" data-action="cancel-take-job" data-id="' + job.id + '">Cancel</button>';
    } else {
      action = '<button type="button" class="btn btn-primary btn-small" data-action="take-job" data-id="' + job.id + '"' + (myAccount && !ui.publishing ? '' : ' disabled') + '>Take job</button>';
    }
    return '<div class="job-row' + (isMine ? ' mine' : '') + '">' +
      '<div class="job-title">' + esc(job.title) + (job.qualification ? '<span class="qual-badge">Requires ' + esc(job.qualification) + '</span>' : '') + shiftBadge + '</div>' +
      '<div class="job-pay mono">' + fmt(job.pay) + '/day</div>' +
      '<div class="job-actions">' + action + '</div>' +
    '</div>';
  }

  function jobsPanelTpl(accounts, selectedId, ui){
    var myAccount = accounts.filter(function(a){ return a.id === selectedId; })[0] || null;
    var jobs = filteredJobs(ui.jobFilter);
    // Pin your own current job to the top of the list so it's easy to find.
    if (myAccount && myAccount.job){
      var mineIdx = jobs.findIndex(function(j){ return j.id === myAccount.job; });
      if (mineIdx > 0) jobs.unshift(jobs.splice(mineIdx, 1)[0]);
    }
    var rows = jobs.length
      ? '<div class="job-list">' + jobs.map(function(j){ return jobRowTpl(j, myAccount, ui); }).join("") + '</div>'
      : '<div class="empty-accounts">No jobs match your search.</div>';
    var hint = !myAccount ? '<div class="notice">Choose a bank account above to get hired for a job.</div>' : '';

    return '' +
    '<section class="panel jobs-panel">' +
      '<div class="panel-head">' +
        '<div><h2>Jobs</h2><div class="sub">Clock in with Start shift — 20 real minutes on shift pays a full day’s wage, prorated by the second</div></div>' +
      '</div>' +
      '<div class="panel-body">' +
        hint +
        '<div class="job-toolbar">' +
          '<input id="job-search" type="search" autocomplete="off" placeholder="Search jobs…" value="' + esc(ui.jobFilter.query) + '">' +
          '<div class="seg">' +
            '<button type="button" class="seg-btn' + (ui.jobFilter.qual === "all" ? ' active' : '') + '" data-action="job-qual-filter" data-qual="all">All jobs</button>' +
            '<button type="button" class="seg-btn' + (ui.jobFilter.qual === "none" ? ' active' : '') + '" data-action="job-qual-filter" data-qual="none">No qualification</button>' +
            '<button type="button" class="seg-btn' + (ui.jobFilter.qual === "required" ? ' active' : '') + '" data-action="job-qual-filter" data-qual="required">Requires qualification</button>' +
          '</div>' +
        '</div>' +
        rows +
      '</div>' +
    '</section>';
  }

  function carRowTpl(car, ui, isPendingRemove){
    return '<div class="car-card">' +
      '<div class="car-photo"><img src="' + esc(car.photo) + '" alt="' + esc(car.title) + '" loading="lazy"></div>' +
      '<div class="car-body">' +
        '<div class="car-title">' + esc(car.title) + '</div>' +
        '<div class="car-meta"><span class="mono">' + fmt(car.price) + '</span> &middot; <span class="mono">' + fmtInt(car.mileage) + ' mi</span></div>' +
        '<div class="car-seller">Listed by ' + esc(car.listedBy || "a player") + '</div>' +
      '</div>' +
      '<div class="car-actions">' +
        (isPendingRemove
          ? '<button type="button" class="btn btn-danger btn-small" data-action="confirm-remove-car" data-id="' + esc(car.id) + '"' + (ui.publishing ? ' disabled' : '') + '>Confirm?</button>'
          : '<button type="button" class="btn-text" data-action="remove-car" data-id="' + esc(car.id) + '"' + (ui.publishing ? ' disabled' : '') + '>Remove</button>') +
      '</div>' +
    '</div>';
  }

  function carsPanelTpl(cars, ui){
    var list = cars.length
      ? '<div class="car-grid">' + cars.map(function(c){ return carRowTpl(c, ui, c.id === ui.pendingCarRemoveId); }).join("") + '</div>'
      : '<div class="empty-state">' + EMPTY_CARS_SVG + '<p>The lot is empty. List the first car below — a photo, price and mileage are all it takes.</p></div>';

    var notice = !ui.writable
      ? '<div class="notice warn">This view can’t save changes right now, so new listings won’t be shared with other players.</div>'
      : "";

    var photoPreview = ui.pendingCarPhoto
      ? '<div class="car-photo-preview"><img src="' + esc(ui.pendingCarPhoto) + '" alt="Selected photo preview"></div>'
      : "";

    var form = ui.writable
      ? '<details class="new-account" id="car-form-details"' + (ui.carFormOpen ? ' open' : '') + '>' +
          '<summary>List a car</summary>' +
          '<form data-form="list-car">' +
            '<div class="form-grid">' +
              '<div class="field"><label for="fld-car-title">Make &amp; model</label><input id="fld-car-title" name="title" type="text" maxlength="60" placeholder="e.g. Meridian GT" value="' + esc(ui.carDraft.title) + '" required></div>' +
              '<div class="field"><label for="fld-car-price">Price</label><input id="fld-car-price" name="price" type="number" min="0" step="1" placeholder="0" value="' + esc(ui.carDraft.price) + '" required></div>' +
              '<div class="field"><label for="fld-car-mileage">Mileage</label><input id="fld-car-mileage" name="mileage" type="number" min="0" step="1" placeholder="0" value="' + esc(ui.carDraft.mileage) + '" required></div>' +
            '</div>' +
            '<div class="field" style="margin-top:12px;"><label for="fld-car-photo">Photo</label><input id="fld-car-photo" name="photo" type="file" accept="image/*"></div>' +
            photoPreview +
            (ui.carFormError ? '<div class="form-error">' + esc(ui.carFormError) + '</div>' : '') +
            '<div class="form-actions">' +
              '<button type="submit" class="btn btn-primary" ' + (ui.publishing ? 'disabled' : '') + '>' + (ui.publishing ? 'Listing…' : 'List car') + '</button>' +
              '<span style="font-size:12.5px;color:var(--text-faint);">A photo, price and mileage are all required</span>' +
            '</div>' +
          '</form>' +
        '</details>'
      : "";

    return '' +
    '<section class="panel">' +
      '<div class="panel-head"><div><h2>Car Marketplace</h2><div class="sub">Player-listed cars for sale</div></div></div>' +
      '<div class="panel-body">' +
        notice +
        list +
        form +
      '</div>' +
    '</section>';
  }

  function houseRowTpl(house, ui, isPendingRemove){
    return '<div class="house-card">' +
      '<div class="house-photo"><img src="' + esc(house.photo) + '" alt="' + esc(house.address) + '" loading="lazy"></div>' +
      '<div class="house-body">' +
        '<div class="house-title">' + esc(house.address) + '</div>' +
        '<div class="house-meta"><span class="mono">' + fmt(house.price) + '</span> &middot; Owned by ' + esc(house.owner) + '</div>' +
        '<div class="house-seller">' + fmtInt(house.age) + ' yrs old &middot; Listed by ' + esc(house.listedBy || "a player") + '</div>' +
      '</div>' +
      '<div class="house-actions">' +
        (isPendingRemove
          ? '<button type="button" class="btn btn-danger btn-small" data-action="confirm-remove-house" data-id="' + esc(house.id) + '"' + (ui.publishing ? ' disabled' : '') + '>Confirm?</button>'
          : '<button type="button" class="btn-text" data-action="remove-house" data-id="' + esc(house.id) + '"' + (ui.publishing ? ' disabled' : '') + '>Remove</button>') +
      '</div>' +
    '</div>';
  }

  function housesPanelTpl(houses, ui){
    var list = houses.length
      ? '<div class="house-grid">' + houses.map(function(h){ return houseRowTpl(h, ui, h.id === ui.pendingHouseRemoveId); }).join("") + '</div>'
      : '<div class="empty-state">' + EMPTY_HOUSES_SVG + '<p>No houses on the market yet. List the first one below — a photo, price, owner and age are all it takes.</p></div>';

    var notice = !ui.writable
      ? '<div class="notice warn">This view can’t save changes right now, so new listings won’t be shared with other players.</div>'
      : "";

    var photoPreview = ui.pendingHousePhoto
      ? '<div class="house-photo-preview"><img src="' + esc(ui.pendingHousePhoto) + '" alt="Selected photo preview"></div>'
      : "";

    var form = ui.writable
      ? '<details class="new-account" id="house-form-details"' + (ui.houseFormOpen ? ' open' : '') + '>' +
          '<summary>List a house</summary>' +
          '<form data-form="list-house">' +
            '<div class="form-grid">' +
              '<div class="field"><label for="fld-house-address">Property name / address</label><input id="fld-house-address" name="address" type="text" maxlength="60" placeholder="e.g. 12 Maple Ridge" value="' + esc(ui.houseDraft.address) + '" required></div>' +
              '<div class="field"><label for="fld-house-price">Price</label><input id="fld-house-price" name="price" type="number" min="0" step="1" placeholder="0" value="' + esc(ui.houseDraft.price) + '" required></div>' +
              '<div class="field"><label for="fld-house-owner">Current owner</label><input id="fld-house-owner" name="owner" type="text" maxlength="40" placeholder="e.g. RustyGearFox" value="' + esc(ui.houseDraft.owner) + '" required></div>' +
            '</div>' +
            '<div class="form-grid" style="grid-template-columns:1fr;max-width:200px;">' +
              '<div class="field"><label for="fld-house-age">Age (years)</label><input id="fld-house-age" name="age" type="number" min="0" step="1" placeholder="0" value="' + esc(ui.houseDraft.age) + '" required></div>' +
            '</div>' +
            '<div class="field" style="margin-top:12px;"><label for="fld-house-photo">Photo / screenshot</label><input id="fld-house-photo" name="photo" type="file" accept="image/*"></div>' +
            photoPreview +
            (ui.houseFormError ? '<div class="form-error">' + esc(ui.houseFormError) + '</div>' : '') +
            '<div class="form-actions">' +
              '<button type="submit" class="btn btn-primary" ' + (ui.publishing ? 'disabled' : '') + '>' + (ui.publishing ? 'Listing…' : 'List house') + '</button>' +
              '<span style="font-size:12.5px;color:var(--text-faint);">A photo, price, owner and age are all required</span>' +
            '</div>' +
          '</form>' +
        '</details>'
      : "";

    return '' +
    '<section class="panel">' +
      '<div class="panel-head"><div><h2>House Marketplace</h2><div class="sub">Player-listed houses for sale</div></div></div>' +
      '<div class="panel-body">' +
        notice +
        list +
        form +
      '</div>' +
    '</section>';
  }

  function bankingPanelTpl(accounts, selectedId, ui){
    var selected = accounts.filter(function(a){ return a.id === selectedId; })[0] || null;
    var hint = !selected ? '<div class="notice">Choose a bank account above to transfer money or add/remove funds.</div>' : '';

    var tabs = '<div class="seg">' +
      '<button type="button" class="seg-btn' + (ui.bankingTab === "transfer" ? ' active' : '') + '" data-action="banking-tab" data-tab="transfer">Transfer money</button>' +
      '<button type="button" class="seg-btn' + (ui.bankingTab === "adjust" ? ' active' : '') + '" data-action="banking-tab" data-tab="adjust">Add / remove funds</button>' +
    '</div>';

    var body = "";
    if (selected){
      var messages =
        (ui.bankingError ? '<div class="form-error">' + esc(ui.bankingError) + '</div>' : '') +
        (ui.bankingNotice ? '<div class="notice success" style="margin-top:12px;margin-bottom:0;">' + esc(ui.bankingNotice) + '</div>' : '');

      if (ui.bankingTab === "transfer"){
        var others = accounts.filter(function(a){ return a.id !== selected.id; });
        var options = others.length
          ? others.map(function(a){ return '<option value="' + esc(a.id) + '"' + (ui.transferDraft.toAccountId === a.id ? ' selected' : '') + '>' + esc(a.holder) + ' — ' + TYPE_LABEL[a.type] + ' — ' + esc(a.accountNumber) + '</option>'; }).join("")
          : '<option value="">No other accounts yet</option>';
        body = '' +
          '<div class="banking-summary"><div class="label">From</div><div class="value">' + esc(selected.holder) + ' &middot; ' + fmt(selected.balance) + ' available</div></div>' +
          '<div class="form-grid" style="grid-template-columns:1.4fr 1fr;">' +
            '<div class="field"><label for="fld-transfer-to">Send to</label><select id="fld-transfer-to"' + (others.length ? '' : ' disabled') + '>' +
              '<option value="">Choose an account…</option>' + options +
            '</select></div>' +
            '<div class="field"><label for="fld-transfer-amount">Amount</label><input id="fld-transfer-amount" type="number" min="0" step="1" placeholder="0" value="' + esc(ui.transferDraft.amount) + '"></div>' +
          '</div>' +
          messages +
          '<div class="form-actions">' +
            '<button type="button" class="btn btn-primary" data-action="do-transfer"' + (ui.publishing || !others.length ? ' disabled' : '') + '>' + (ui.publishing ? 'Sending…' : 'Send transfer') + '</button>' +
          '</div>';
      } else {
        body = '' +
          '<div class="banking-summary"><div class="label">Account</div><div class="value">' + esc(selected.holder) + ' &middot; ' + fmt(selected.balance) + ' current balance</div></div>' +
          '<div class="form-grid" style="grid-template-columns:1fr;max-width:220px;">' +
            '<div class="field"><label for="fld-adjust-amount">Amount</label><input id="fld-adjust-amount" type="number" min="0" step="1" placeholder="0" value="' + esc(ui.adjustDraft.amount) + '"></div>' +
          '</div>' +
          messages +
          '<div class="form-actions">' +
            '<button type="button" class="btn btn-primary" data-action="add-funds"' + (ui.publishing ? ' disabled' : '') + '>Add funds</button>' +
            '<button type="button" class="btn btn-danger" data-action="remove-funds"' + (ui.publishing ? ' disabled' : '') + '>Remove funds</button>' +
          '</div>';
      }
    }

    return '' +
    '<section class="panel jobs-panel">' +
      '<div class="panel-head">' +
        '<div><h2>Banking Tools</h2><div class="sub">Transfer money between accounts, or add and remove funds from the account you’re viewing as</div></div>' +
      '</div>' +
      '<div class="panel-body">' +
        hint +
        (selected ? tabs : '') +
        (selected ? '<div style="margin-top:18px;">' + body + '</div>' : '') +
      '</div>' +
    '</section>';
  }

  function footerTpl(){
    return '<footer>FoxMountain.rbx is a fan-made, community-run banking system for a Roblox game and is not affiliated with or endorsed by Roblox Corporation. All balances are in-game play currency with no real-world value.</footer>';
  }

  function appTpl(accounts, cars, houses, selectedId, ui){
    return '<div id="app">' +
      headerTpl(accounts, cars, houses) +
      '<div class="layout">' +
        accountsPanelTpl(accounts, selectedId, ui) +
        '<div class="side-stack">' + carsPanelTpl(cars, ui) + housesPanelTpl(houses, ui) + '</div>' +
      '</div>' +
      jobsPanelTpl(accounts, selectedId, ui) +
      bankingPanelTpl(accounts, selectedId, ui) +
      footerTpl() +
    '</div>';
  }

  /* ---------------- render ---------------- */
  var mount = document.getElementById("app");
  function render(){
    var active = document.activeElement;
    var focusInfo = null;
    if (active && mount.contains(active) && active.id){
      focusInfo = {id: active.id, start: active.selectionStart, end: active.selectionEnd};
    }
    var wrapper = document.createElement("div");
    wrapper.innerHTML = appTpl(state.accounts, state.cars, state.houses, local.selectedAccountId, ui);
    var fresh = wrapper.firstChild;
    mount.replaceWith(fresh);
    mount = fresh;
    if (focusInfo){
      var el = document.getElementById(focusInfo.id);
      if (el){
        el.focus();
        if (typeof focusInfo.start === "number" && el.setSelectionRange){
          try{ el.setSelectionRange(focusInfo.start, focusInfo.end); }catch(e){}
        }
      }
    }
  }

  /* ---------------- persistence (server-backed) ---------------- */
  // Optimistically apply the patch locally, send just that patch to the
  // server, then reconcile with whatever the server says the merged state
  // now is (in case another player's change landed in between).
  function persist(patch){
    var previous = state;
    var nextState = Object.assign({}, state, patch);
    state = nextState; ui.publishing = true; render();
    fetch("/api/state", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(patch)
    }).then(function(res){
      if (!res.ok) throw new Error("save failed");
      return res.json();
    }).then(function(serverState){
      state = {
        accounts: Array.isArray(serverState.accounts) ? serverState.accounts : [],
        cars: Array.isArray(serverState.cars) ? serverState.cars : [],
        houses: Array.isArray(serverState.houses) ? serverState.houses : []
      };
      ui.publishing = false;
      render();
    }).catch(function(){
      ui.publishing = false;
      ui.formError = "Couldn’t save that change. Please try again.";
      state = previous;
      render();
    });
  }

  /* ---------------- actions: accounts ---------------- */
  function onSubmitCreate(form){
    var holder = (form.elements.holder.value || "").trim();
    var type = form.elements.type.value;
    var balance = Number(form.elements.balance.value);
    if (!holder){ ui.formError = "Enter a player name for this account."; render(); return; }
    if (!isFinite(balance) || balance < 0) balance = 0;
    ui.formError = "";
    var account = {id:genId(), holder:holder, type:type, balance:balance, accountNumber:genAccountNumber(), createdAt:Date.now(), job:null, onShift:false, shiftStartedAt:null};
    var nextAccounts = state.accounts.concat([account]);
    local.selectedAccountId = account.id;
    ui.accountFormOpen = false;
    saveLocal();
    persist({accounts:nextAccounts});
  }

  function onChoose(id){
    local.selectedAccountId = id;
    ui.bankingError = "";
    ui.bankingNotice = "";
    saveLocal();
    render();
  }

  function onRemoveClick(id){
    ui.pendingRemoveId = (ui.pendingRemoveId === id) ? null : id;
    render();
  }

  function onConfirmRemove(id){
    ui.pendingRemoveId = null;
    var nextAccounts = state.accounts.filter(function(a){ return a.id !== id; });
    if (local.selectedAccountId === id){ local.selectedAccountId = null; saveLocal(); }
    persist({accounts:nextAccounts});
  }

  /* ---------------- shared: photo capture ---------------- */
  // Reads the file, downscales it on a canvas and re-encodes it as a modest
  // JPEG so a shared listing's photo stays a reasonable size. Used by both
  // the car and house marketplace forms.
  function readAndCompressPhoto(file, callback){
    var reader = new FileReader();
    reader.onload = function(){
      var img = new Image();
      img.onload = function(){
        var maxDim = 640;
        var scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        var w = Math.max(1, Math.round(img.width * scale));
        var h = Math.max(1, Math.round(img.height * scale));
        var canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        var dataUrl;
        try{ dataUrl = canvas.toDataURL("image/jpeg", 0.72); }catch(e){ dataUrl = null; }
        callback(dataUrl);
      };
      img.onerror = function(){ callback(null); };
      img.src = reader.result;
    };
    reader.onerror = function(){ callback(null); };
    reader.readAsDataURL(file);
  }

  /* ---------------- actions: car marketplace ---------------- */
  function onCarPhotoChosen(input){
    var file = input.files && input.files[0];
    if (!file) return;
    if (!/^image\//.test(file.type)){
      ui.carFormError = "Please choose an image file.";
      ui.pendingCarPhoto = null;
      render();
      return;
    }
    ui.carFormError = "";
    readAndCompressPhoto(file, function(dataUrl){
      if (!dataUrl){ ui.carFormError = "Couldn’t read that photo — try a different file."; render(); return; }
      ui.pendingCarPhoto = dataUrl;
      render();
    });
  }

  function onSubmitCar(form){
    var title = (form.elements.title.value || "").trim();
    var price = Number(form.elements.price.value);
    var mileage = Number(form.elements.mileage.value);
    if (!title){ ui.carFormError = "Enter the car’s make and model."; render(); return; }
    if (!isFinite(price) || price < 0){ ui.carFormError = "Enter a valid price."; render(); return; }
    if (!isFinite(mileage) || mileage < 0){ ui.carFormError = "Enter a valid mileage."; render(); return; }
    if (!ui.pendingCarPhoto){ ui.carFormError = "Add a photo of the car."; render(); return; }
    ui.carFormError = "";
    var seller = state.accounts.filter(function(a){ return a.id === local.selectedAccountId; })[0] || null;
    var car = {
      id: genCarId(), title: title, price: price, mileage: mileage, photo: ui.pendingCarPhoto,
      listedBy: seller ? seller.holder : null, listedAccountId: seller ? seller.id : null, createdAt: Date.now()
    };
    var nextCars = state.cars.concat([car]);
    ui.pendingCarPhoto = null;
    ui.carDraft = {title:"", price:"", mileage:""};
    ui.carFormOpen = false;
    persist({cars:nextCars});
  }

  function onRemoveCarClick(id){
    ui.pendingCarRemoveId = (ui.pendingCarRemoveId === id) ? null : id;
    render();
  }

  function onConfirmRemoveCar(id){
    ui.pendingCarRemoveId = null;
    var nextCars = state.cars.filter(function(c){ return c.id !== id; });
    persist({cars:nextCars});
  }

  /* ---------------- actions: house marketplace ---------------- */
  function onHousePhotoChosen(input){
    var file = input.files && input.files[0];
    if (!file) return;
    if (!/^image\//.test(file.type)){
      ui.houseFormError = "Please choose an image file.";
      ui.pendingHousePhoto = null;
      render();
      return;
    }
    ui.houseFormError = "";
    readAndCompressPhoto(file, function(dataUrl){
      if (!dataUrl){ ui.houseFormError = "Couldn’t read that photo — try a different file."; render(); return; }
      ui.pendingHousePhoto = dataUrl;
      render();
    });
  }

  function onSubmitHouse(form){
    var address = (form.elements.address.value || "").trim();
    var price = Number(form.elements.price.value);
    var owner = (form.elements.owner.value || "").trim();
    var age = Number(form.elements.age.value);
    if (!address){ ui.houseFormError = "Enter the property’s name or address."; render(); return; }
    if (!isFinite(price) || price < 0){ ui.houseFormError = "Enter a valid price."; render(); return; }
    if (!owner){ ui.houseFormError = "Enter the current owner’s name."; render(); return; }
    if (!isFinite(age) || age < 0){ ui.houseFormError = "Enter a valid age."; render(); return; }
    if (!ui.pendingHousePhoto){ ui.houseFormError = "Add a photo or screenshot of the house."; render(); return; }
    ui.houseFormError = "";
    var seller = state.accounts.filter(function(a){ return a.id === local.selectedAccountId; })[0] || null;
    var house = {
      id: genHouseId(), address: address, price: price, owner: owner, age: age, photo: ui.pendingHousePhoto,
      listedBy: seller ? seller.holder : null, listedAccountId: seller ? seller.id : null, createdAt: Date.now()
    };
    var nextHouses = state.houses.concat([house]);
    ui.pendingHousePhoto = null;
    ui.houseDraft = {address:"", price:"", owner:"", age:""};
    ui.houseFormOpen = false;
    persist({houses:nextHouses});
  }

  function onRemoveHouseClick(id){
    ui.pendingHouseRemoveId = (ui.pendingHouseRemoveId === id) ? null : id;
    render();
  }

  function onConfirmRemoveHouse(id){
    ui.pendingHouseRemoveId = null;
    var nextHouses = state.houses.filter(function(h){ return h.id !== id; });
    persist({houses:nextHouses});
  }

  /* ---------------- actions: banking tools ---------------- */
  function onBankingTabClick(tab){
    ui.bankingTab = tab;
    ui.bankingError = "";
    ui.bankingNotice = "";
    render();
  }

  function onDoTransfer(){
    if (!local.selectedAccountId) return;
    var fromIdx = state.accounts.findIndex(function(a){ return a.id === local.selectedAccountId; });
    if (fromIdx < 0) return;
    var toId = ui.transferDraft.toAccountId;
    if (!toId){ ui.bankingError = "Choose an account to send money to."; ui.bankingNotice = ""; render(); return; }
    var toIdx = state.accounts.findIndex(function(a){ return a.id === toId; });
    if (toIdx < 0 || toIdx === fromIdx){ ui.bankingError = "Choose a different account to send to."; ui.bankingNotice = ""; render(); return; }
    var amount = Number(ui.transferDraft.amount);
    if (!isFinite(amount) || amount <= 0){ ui.bankingError = "Enter an amount greater than $0."; ui.bankingNotice = ""; render(); return; }
    var fromAccount = state.accounts[fromIdx];
    if (amount > (Number(fromAccount.balance)||0)){ ui.bankingError = "That account doesn’t have enough balance for this transfer."; ui.bankingNotice = ""; render(); return; }
    ui.bankingError = "";
    var nextAccounts = state.accounts.slice();
    nextAccounts[fromIdx] = Object.assign({}, nextAccounts[fromIdx], {balance: (Number(nextAccounts[fromIdx].balance)||0) - amount});
    nextAccounts[toIdx] = Object.assign({}, nextAccounts[toIdx], {balance: (Number(nextAccounts[toIdx].balance)||0) + amount});
    var toHolder = state.accounts[toIdx].holder;
    ui.transferDraft = {toAccountId:"", amount:""};
    ui.bankingNotice = "Sent " + fmt(amount) + " to " + toHolder + ".";
    persist({accounts: nextAccounts});
  }

  function onAdjustFunds(mode){
    if (!local.selectedAccountId) return;
    var idx = state.accounts.findIndex(function(a){ return a.id === local.selectedAccountId; });
    if (idx < 0) return;
    var amount = Number(ui.adjustDraft.amount);
    if (!isFinite(amount) || amount <= 0){ ui.bankingError = "Enter an amount greater than $0."; ui.bankingNotice = ""; render(); return; }
    var account = state.accounts[idx];
    if (mode === "remove" && amount > (Number(account.balance)||0)){ ui.bankingError = "Can’t remove more than the current balance."; ui.bankingNotice = ""; render(); return; }
    ui.bankingError = "";
    var nextAccounts = state.accounts.slice();
    var nextBalance = mode === "add" ? (Number(account.balance)||0) + amount : (Number(account.balance)||0) - amount;
    nextAccounts[idx] = Object.assign({}, account, {balance: nextBalance});
    ui.adjustDraft = {amount:""};
    ui.bankingNotice = (mode === "add" ? "Added " : "Removed ") + fmt(amount) + (mode === "add" ? " to " : " from ") + account.holder + "’s balance.";
    persist({accounts: nextAccounts});
  }

  /* ---------------- shift pay ---------------- */
  // Banks whatever an account has earned on its CURRENT job/shift so far,
  // without touching job/onShift — used before switching or quitting a job
  // so no earned time is lost.
  function settleAccountNow(account){
    if (!account.onShift || !account.shiftStartedAt || !account.job) return account;
    var job = JOBS_BY_ID[account.job];
    if (!job) return account;
    var elapsed = Date.now() - account.shiftStartedAt;
    if (elapsed <= 0) return account;
    return Object.assign({}, account, {balance: (Number(account.balance)||0) + (elapsed / SHIFT_MS) * job.pay});
  }

  function assignJob(jobId){
    if (!local.selectedAccountId) return;
    var idx = state.accounts.findIndex(function(a){ return a.id === local.selectedAccountId; });
    if (idx < 0) return;
    var nextAccounts = state.accounts.slice();
    var settled = settleAccountNow(nextAccounts[idx]);
    nextAccounts[idx] = Object.assign({}, settled, {job:jobId, onShift:false, shiftStartedAt:null});
    persist({accounts:nextAccounts});
  }

  function onTakeJobClick(jobId){
    if (!local.selectedAccountId) return;
    var job = JOBS_BY_ID[jobId];
    if (job && job.qualification){ ui.pendingJobConfirmId = jobId; render(); return; }
    assignJob(jobId);
  }

  function onConfirmTakeJob(jobId){ ui.pendingJobConfirmId = null; assignJob(jobId); }
  function onCancelTakeJob(){ ui.pendingJobConfirmId = null; render(); }

  function onQuitJob(){
    if (!local.selectedAccountId) return;
    var idx = state.accounts.findIndex(function(a){ return a.id === local.selectedAccountId; });
    if (idx < 0) return;
    var nextAccounts = state.accounts.slice();
    var settled = settleAccountNow(nextAccounts[idx]);
    nextAccounts[idx] = Object.assign({}, settled, {job:null, onShift:false, shiftStartedAt:null});
    persist({accounts:nextAccounts});
  }

  function onStartShift(){
    if (!local.selectedAccountId) return;
    var idx = state.accounts.findIndex(function(a){ return a.id === local.selectedAccountId; });
    if (idx < 0) return;
    var acc = state.accounts[idx];
    if (!acc.job || acc.onShift) return;
    var nextAccounts = state.accounts.slice();
    nextAccounts[idx] = Object.assign({}, acc, {onShift:true, shiftStartedAt:Date.now()});
    persist({accounts:nextAccounts});
  }

  function onStopShift(){
    if (!local.selectedAccountId) return;
    var idx = state.accounts.findIndex(function(a){ return a.id === local.selectedAccountId; });
    if (idx < 0) return;
    var acc = state.accounts[idx];
    if (!acc.onShift) return;
    var nextAccounts = state.accounts.slice();
    var settled = settleAccountNow(acc);
    nextAccounts[idx] = Object.assign({}, settled, {onShift:false, shiftStartedAt:null});
    persist({accounts:nextAccounts});
  }

  // Live, display-only ticker for the account you're viewing as — purely a
  // read of the fixed shiftStartedAt checkpoint, never written back, so it
  // climbs smoothly and only the real Stop/Quit/switch actions touch balance.
  setInterval(function(){
    var el = document.getElementById("shift-ticker");
    if (!el) return;
    var acc = state.accounts.filter(function(a){ return a.id === local.selectedAccountId; })[0];
    if (!acc || !acc.onShift || !acc.shiftStartedAt || !acc.job) return;
    var job = JOBS_BY_ID[acc.job];
    if (!job) return;
    var elapsed = Date.now() - acc.shiftStartedAt;
    el.innerHTML = '<span class="shift-dot"></span>' + esc(fmtPrecise((elapsed / SHIFT_MS) * job.pay)) + ' earned this shift';
  }, 1000);

  /* ---------------- delegated events ---------------- */
  document.addEventListener("submit", function(e){
    var accountForm = e.target.closest('form[data-form="create-account"]');
    if (accountForm){ e.preventDefault(); onSubmitCreate(accountForm); return; }
    var carForm = e.target.closest('form[data-form="list-car"]');
    if (carForm){ e.preventDefault(); onSubmitCar(carForm); return; }
    var houseForm = e.target.closest('form[data-form="list-house"]');
    if (houseForm){ e.preventDefault(); onSubmitHouse(houseForm); return; }
  });

  document.addEventListener("click", function(e){
    var btn = e.target.closest("[data-action]");
    if (!btn) return;
    var action = btn.getAttribute("data-action");
    var id = btn.getAttribute("data-id");
    if (action === "choose") onChoose(id);
    else if (action === "remove") onRemoveClick(id);
    else if (action === "confirm-remove") onConfirmRemove(id);
    else if (action === "take-job") onTakeJobClick(id);
    else if (action === "confirm-take-job") onConfirmTakeJob(id);
    else if (action === "cancel-take-job") onCancelTakeJob();
    else if (action === "quit-job") onQuitJob();
    else if (action === "start-shift") onStartShift();
    else if (action === "stop-shift") onStopShift();
    else if (action === "remove-car") onRemoveCarClick(id);
    else if (action === "confirm-remove-car") onConfirmRemoveCar(id);
    else if (action === "remove-house") onRemoveHouseClick(id);
    else if (action === "confirm-remove-house") onConfirmRemoveHouse(id);
    else if (action === "banking-tab") onBankingTabClick(btn.getAttribute("data-tab"));
    else if (action === "do-transfer") onDoTransfer();
    else if (action === "add-funds") onAdjustFunds("add");
    else if (action === "remove-funds") onAdjustFunds("remove");
    else if (action === "job-qual-filter"){
      ui.jobFilter.qual = btn.getAttribute("data-qual");
      render();
    }
  });

  document.addEventListener("input", function(e){
    if (!e.target || !e.target.id) return;
    if (e.target.id === "job-search"){
      ui.jobFilter.query = e.target.value;
      render();
    } else if (e.target.id === "fld-car-title"){
      ui.carDraft.title = e.target.value;
      render();
    } else if (e.target.id === "fld-car-price"){
      ui.carDraft.price = e.target.value;
      render();
    } else if (e.target.id === "fld-car-mileage"){
      ui.carDraft.mileage = e.target.value;
      render();
    } else if (e.target.id === "fld-house-address"){
      ui.houseDraft.address = e.target.value;
      render();
    } else if (e.target.id === "fld-house-price"){
      ui.houseDraft.price = e.target.value;
      render();
    } else if (e.target.id === "fld-house-owner"){
      ui.houseDraft.owner = e.target.value;
      render();
    } else if (e.target.id === "fld-house-age"){
      ui.houseDraft.age = e.target.value;
      render();
    } else if (e.target.id === "fld-transfer-to"){
      ui.transferDraft.toAccountId = e.target.value;
      render();
    } else if (e.target.id === "fld-transfer-amount"){
      ui.transferDraft.amount = e.target.value;
      render();
    } else if (e.target.id === "fld-adjust-amount"){
      ui.adjustDraft.amount = e.target.value;
      render();
    }
  });

  document.addEventListener("change", function(e){
    if (!e.target || !e.target.id) return;
    if (e.target.id === "fld-car-photo"){
      onCarPhotoChosen(e.target);
    } else if (e.target.id === "fld-house-photo"){
      onHousePhotoChosen(e.target);
    } else if (e.target.id === "fld-transfer-to"){
      // Some browsers only fire "change" (not "input") for <select> elements.
      ui.transferDraft.toAccountId = e.target.value;
      render();
    }
  });

  // <toggle> events on <details> don't bubble in every browser, so this has
  // to listen on the capture phase to reliably see them. Track each form's
  // open/closed state here — render() bakes the "open" attribute straight
  // back in from these, so typing in a field no longer snaps an expanded
  // accordion shut on the next re-render.
  document.addEventListener("toggle", function(e){
    if (!e.target || !e.target.tagName || e.target.tagName.toLowerCase() !== "details") return;
    if (e.target.id === "account-form-details") ui.accountFormOpen = e.target.open;
    else if (e.target.id === "car-form-details") ui.carFormOpen = e.target.open;
    else if (e.target.id === "house-form-details") ui.houseFormOpen = e.target.open;
  }, true);

  /* ---------------- boot ---------------- */
  render(); // first paint while the initial fetch is in flight

  function fetchState(){
    return fetch("/api/state").then(function(res){
      if (!res.ok) throw new Error("load failed");
      return res.json();
    });
  }

  fetchState().then(function(s){
    state = {
      accounts: Array.isArray(s.accounts) ? s.accounts : [],
      cars: Array.isArray(s.cars) ? s.cars : [],
      houses: Array.isArray(s.houses) ? s.houses : []
    };
    loaded = true;
    ui.writable = true;
    render();
  }).catch(function(){
    ui.writable = false;
    render();
  });

  // Poll for other players' changes. This only ever replaces `state`
  // (the shared accounts/cars/houses) — it never touches `ui`, so it can't
  // interrupt someone mid-form. Skipped while a save is in flight so it
  // can't race with persist()'s own reconciliation.
  setInterval(function(){
    if (ui.publishing) return;
    fetchState().then(function(s){
      var next = {
        accounts: Array.isArray(s.accounts) ? s.accounts : [],
        cars: Array.isArray(s.cars) ? s.cars : [],
        houses: Array.isArray(s.houses) ? s.houses : []
      };
      if (JSON.stringify(next) === JSON.stringify(state)) return;
      state = next;
      if (!loaded){ loaded = true; ui.writable = true; }
      render();
    }).catch(function(){ /* transient network hiccup — try again next tick */ });
  }, 4000);
})();
