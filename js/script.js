/* LikhaLuntian - interactions (plain script; sections run in this order, cart engine must stay first) */


/* =========================================================
   js/01-cart-engine.js - PART A - SHARED ENGINE (cart storage/render/toast). Must load first.
   ========================================================= */

// =========================================================
// PART A - SHARED ENGINE (must load first)
// =========================================================

// ---------- A1 Cart engine: storage, render, badge, toast (used by every page) ----------
var CART_STORAGE_KEY = "likhaluntianCart";                                           // localStorage key

function cartRead() {                                                                // load saved cart
  try {                                                                              // localStorage can throw
    var raw = window.localStorage.getItem(CART_STORAGE_KEY);                         // stored JSON
    var items = raw ? JSON.parse(raw) : [];                                          // parse or empty
    return Array.isArray(items) ? items : [];                                        // guard shape
  } catch (err) {                                                                    // e.g. storage disabled
    return [];                                                                       // fall back to empty
  }
}

function cartSave(items) {                                                          // persist cart
  try {                                                                              // localStorage can throw
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));            // write JSON
  } catch (err) { /* ignore write failures (e.g. private browsing) */ }
}

function cartAddItem(item) {                                                        // add or merge an item
  var items = cartRead();                                                           // current cart
  var match = items.filter(function (it) {                                          // same product+variant?
    return it.name === item.name && it.variant === item.variant;
  })[0];

  if (match) {                                                                       // already in cart
    if (!match.id && item.id) match.id = item.id;                                   // backfill id (older saves)
    if (!match.image && item.image) match.image = item.image;                       // backfill photo (older saves)
    match.qty += item.qty;                                                          // bump quantity
  } else {                                                                           // new line
    items.push(item);                                                               // add it
  }

  cartSave(items);                                                                  // persist
  cartRender();                                                                     // refresh every open nav
}

function cartRemoveItem(index) {                                                    // remove one line
  var items = cartRead();                                                           // current cart
  items.splice(index, 1);                                                           // drop that line
  cartSave(items);                                                                  // persist
  cartRender();                                                                     // refresh
}

function cartClear() {                                                              // empty the cart
  cartSave([]);                                                                     // wipe storage
  cartRender();                                                                     // refresh
}

function cartRender() {                                                             // redraw badge + dropdown
  if (typeof window.cartPageRender === "function") window.cartPageRender();         // cart.html redraws itself too
  var items = cartRead();                                                           // current cart
  var count = items.reduce(function (sum, it) { return sum + it.qty; }, 0);         // total quantity
  var grandTotal = items.reduce(function (sum, it) {                                // total cost
    return sum + (it.price * it.qty);
  }, 0);

  var countEl = document.getElementById("navCartCount");                            // badge on this page
  if (countEl) {                                                                    // if nav cart exists here
    countEl.textContent = count;                                                    // update number
    countEl.hidden = count === 0;                                                   // hide when empty
  }

  var listEl = document.getElementById("navCartItems");                             // item list container
  if (!listEl) return;                                                              // no cart on this page
  listEl.innerHTML = "";                                                            // clear old rows

  if (items.length === 0) {                                                         // nothing in cart
    var empty = document.createElement("li");                                       // empty-state row
    empty.className = "nav-cart-empty";                                             // styling hook
    empty.textContent = "Your cart is empty.";                                      // message
    listEl.appendChild(empty);                                                      // show it
  } else {                                                                          // has items
    items.forEach(function (item, index) {                                         // render each line
      var li = document.createElement("li");                                       // one row
      li.className = "nav-cart-item";                                              // styling hook

      var info = document.createElement("div");                                    // name + meta block
      var nameSpan = document.createElement("span");                               // product name
      nameSpan.className = "nav-cart-item-name";                                   // styling hook
      nameSpan.textContent = item.name;                                            // set text
      info.appendChild(nameSpan);                                                  // add name

      var metaBits = [];                                                           // build meta line
      if (item.variant) metaBits.push(item.variant);                               // variant if any
      metaBits.push("Qty " + item.qty);                                            // quantity
      var metaSpan = document.createElement("span");                               // meta line
      metaSpan.className = "nav-cart-item-meta";                                   // styling hook
      metaSpan.textContent = metaBits.join(" \u00b7 ");                            // "Variant · Qty N"
      info.appendChild(metaSpan);                                                  // add meta

      var priceSpan = document.createElement("span");                              // line total
      priceSpan.className = "nav-cart-item-price";                                 // styling hook
      priceSpan.textContent = "\u20b1" + (item.price * item.qty).toLocaleString("en-PH"); // ₱ total

      var removeBtn = document.createElement("button");                            // remove (×) button
      removeBtn.type = "button";                                                   // not a submit
      removeBtn.className = "nav-cart-item-remove";                                // styling hook
      removeBtn.setAttribute("aria-label", "Remove " + item.name + " from cart");  // a11y label
      removeBtn.textContent = "\u2715";                                            // × glyph
      removeBtn.addEventListener("click", function () { cartRemoveItem(index); }); // wire removal

      var right = document.createElement("div");                                   // price + remove block
      right.style.display = "flex";                                                // sit side by side
      right.style.alignItems = "flex-start";                                       // top align
      right.appendChild(priceSpan);                                                // add price
      right.appendChild(removeBtn);                                                // add remove button

      li.appendChild(info);                                                        // name/meta on the left
      li.appendChild(right);                                                       // price/remove on the right
      listEl.appendChild(li);                                                      // add row to list
    });
  }

  var totalEl = document.getElementById("navCartTotal");                            // grand total display
  if (totalEl) {                                                                    // if present
    totalEl.textContent = "\u20b1" + grandTotal.toLocaleString("en-PH");            // update total
  }
}

function cartPulseBadge() {                                                          // quick "added" feedback
  var el = document.getElementById("navCartCount");                                  // badge on this page
  if (!el) return;                                                                   // no cart on this page
  el.classList.remove("is-pulsing");                                                 // reset in case mid-animation
  void el.offsetWidth;                                                               // force reflow so it can replay
  el.classList.add("is-pulsing");                                                    // trigger the bounce
}

function showCartToast(message) {                                                   // "Added to cart" popup
  var toast = document.getElementById("cartToast");                                 // reuse one element
  if (!toast) {                                                                     // first time: create it
    toast = document.createElement("div");
    toast.id = "cartToast";
    toast.className = "cart-toast";                                                  // styled in style.css
    toast.setAttribute("role", "status");                                           // announced to screen readers
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }
  toast.textContent = message;                                                      // set text
  toast.classList.add("is-visible");                                                // fade in
  clearTimeout(toast._hideTimer);                                                   // restart the timer
  toast._hideTimer = setTimeout(function () { toast.classList.remove("is-visible"); }, 2200);
}

function buyNow() {                                                                 // "Buy Now" button
  window.location.href = "cart.html";                                               // item is already saved by addToCart(); open the cart page
}


/* =========================================================
   js/02-site-wide.js - PART B - SITE-WIDE (nav, slideshow, hover effects, nav search)
   ========================================================= */

// =========================================================
// PART B - SITE-WIDE (every page)
// =========================================================

// ---------- B1 Nav links: color swap on hover ----------
var navLinks = document.getElementsByTagName("nav")[0].getElementsByTagName("a");   // all top-nav links
for (var i = 0; i < navLinks.length; i++) {                                          // loop each link
  navLinks[i].onmouseover = function () {                                            // hover in
    this.style.background = "#E7F3EC";                                               // light green bg
    this.style.color = "#1F4A37";                                                    // dark green text
  };
  navLinks[i].onmouseout = function () {                                             // hover out
    this.style.background = "";                                                      // clear bg
    this.style.color = "";                                                           // clear text
  };
}

// ---------- B2 Nav: transparent over the banner, white 70% after ----------
(function () {                                                                       // private scope
  var nav = document.querySelector(".global-nav");                                  // the top nav
  var banner = document.getElementById("image-slideshow");                          // the banner slideshow
  if (!nav || !banner) return;                                                      // nothing to track

  function updateNav() {                                                            // decide which look to use
    var navH = nav.offsetHeight;                                                    // current nav height
    var rect = banner.getBoundingClientRect();                                      // banner position in viewport
    var overBanner = banner.offsetHeight > 0 && rect.bottom > navH && rect.top <= navH; // banner is behind the nav
    nav.classList.toggle("is-over-banner", overBanner);                             // transparent vs. white 70%
  }

  window.addEventListener("scroll", updateNav, { passive: true });                  // while scrolling
  window.addEventListener("resize", updateNav);                                     // when layout changes
  window.addEventListener("load", updateNav);                                       // after images size the banner
  updateNav();                                                                      // initial state
})();

// ---------- B3 Nav: hamburger menu open/close (mobile) ----------
(function () {                                                                       // private scope
  var toggle = document.getElementById("navToggle");                                // hamburger button
  var panel = document.getElementById("navLinksList");                              // collapsible link panel
  if (!toggle || !panel) return;                                                    // not on this page → exit

  function menuOpen() {                                                             // reveal the panel
    panel.classList.add("is-open");                                                 // show links
    toggle.setAttribute("aria-expanded", "true");                                   // a11y state
  }

  function menuClose() {                                                            // hide the panel
    panel.classList.remove("is-open");                                              // hide links
    toggle.setAttribute("aria-expanded", "false");                                  // a11y state
  }

  toggle.addEventListener("click", function () {                                    // tap the hamburger
    if (panel.classList.contains("is-open")) { menuClose(); } else { menuOpen(); }  // toggle open/closed
  });

  var panelLinks = panel.getElementsByTagName("a");                                 // every link inside the panel
  for (var m = 0; m < panelLinks.length; m++) {                                     // close the panel once
    panelLinks[m].addEventListener("click", function () { menuClose(); });          // a destination is chosen
  }

  document.addEventListener("click", function (e) {                                 // click elsewhere
    if (!panel.contains(e.target) && e.target !== toggle && !toggle.contains(e.target)) {
      menuClose();                                                                  // close the panel
    }
  });

  document.addEventListener("keydown", function (e) {                               // press Escape
    if (e.key === "Escape") menuClose();                                            // close the panel
  });

  window.addEventListener("resize", function () {                                   // rotate / resize to desktop
    if (window.innerWidth > 767) menuClose();                                       // reset once nav is no longer collapsed
  });
})();

// ---------- B4 Nav cart: dropdown open/close + Clear Cart button ----------
(function () {                                                                       // private scope
  var cart = document.getElementById("navCart");                                    // cart wrapper
  var toggleBtn = document.getElementById("navCartBtn");                            // icon button
  var clearBtn = document.getElementById("navCartClear");                           // clear-cart button
  if (!cart || !toggleBtn) return;                                                  // not on this page → exit

  function cartOpen() {                                                             // show the dropdown
    cart.classList.add("is-open");                                                  // reveal panel
    toggleBtn.setAttribute("aria-expanded", "true");                                // a11y state
  }

  function cartClose() {                                                            // hide the dropdown
    cart.classList.remove("is-open");                                               // hide panel
    toggleBtn.setAttribute("aria-expanded", "false");                               // a11y state
  }

  window.cartOpenDropdown = cartOpen;                                               // let addToCart() open it

  toggleBtn.addEventListener("click", function () {                                 // click the cart icon
    if (cart.classList.contains("is-open")) { cartClose(); } else { cartOpen(); }   // toggle
  });

  if (clearBtn) {                                                                   // wire Clear Cart
    clearBtn.addEventListener("click", function () { cartClear(); });               // empty the cart
  }

  document.addEventListener("click", function (e) {                                // click elsewhere
    if (!cart.contains(e.target)) cartClose();                                      // close the dropdown
  });

  document.addEventListener("keydown", function (e) {                              // press Escape
    if (e.key === "Escape") cartClose();                                            // close the dropdown
  });

  var dropdown = document.getElementById("navCartDropdown");                       // add a "View Cart" link
  if (dropdown && !dropdown.querySelector(".nav-cart-view")) {                      // only once
    var viewLink = document.createElement("a");                                    // link to the cart page
    viewLink.className = "nav-cart-view";
    viewLink.href = "cart.html";
    viewLink.textContent = "View Cart";
    dropdown.appendChild(viewLink);
  }

  cartRender();                                                                     // paint saved cart on load
})();

// ---------- B5 Image slideshow (rotates every 3s) ----------
(function () {                                                                       // private scope
  var slideshow = document.getElementById("image-slideshow");                        // the section
  if (!slideshow) return;                                                            // not on homepage

  if (document.querySelector("body > #categories")) {                                // homepage only
  var learn = document.createElement("a");                                           // "Learn more" button
  learn.className = "banner-learn-more";                                             // styled in style.css
  learn.href = "about.html";                                                         // where it goes
  learn.textContent = "Learn more";                                                  // white button text
  slideshow.appendChild(learn);                                                      // sits on the banner
  }

  var slides = slideshow.querySelectorAll(".slide");                                 // all images
  if (slides.length < 2) return;                                                     // need 2+ to rotate

  var current = 0;                                                                   // current index
  setInterval(function () {                                                          // every 3s
    slides[current].classList.remove("is-active");                                   // hide current
    current = (current + 1) % slides.length;                                         // next (wrap)
    slides[current].classList.add("is-active");                                      // show next
  }, 3000);
})();

// ---------- B6 Back links: underline on hover ----------
var backLinks = document.getElementsByClassName("back-link");                        // all back links
for (var m = 0; m < backLinks.length; m++) {                                         // loop each
  backLinks[m].onmouseover = function () { this.style.textDecoration = "underline"; };  // underline in
  backLinks[m].onmouseout  = function () { this.style.textDecoration = ""; };           // remove out
}

// ---------- B7 Product cards: green border + shadow ----------
var cards = document.getElementsByClassName("card");                                 // all product cards
for (var j = 0; j < cards.length; j++) {                                             // loop each card
  cards[j].onmouseover = function () {                                               // hover in
    this.style.borderColor = "#2F7D5B";                                              // green border
    this.style.boxShadow = "0 2px 10px rgba(31, 74, 55, .12)";                       // soft shadow
  };
  cards[j].onmouseout = function () {                                                // hover out
    this.style.borderColor = "";                                                     // reset
    this.style.boxShadow = "";                                                       // reset
  };
}

// ---------- B8 Category cards: border, shadow, scale ----------
var categoryCards = document.getElementsByClassName("category-card");                // all category tiles
for (var k = 0; k < categoryCards.length; k++) {                                     // loop each tile
  categoryCards[k].onmouseover = function () {                                       // hover in
    this.style.borderColor = "#2F7D5B";                                              // green border
    this.style.boxShadow = "0 2px 10px rgba(31, 74, 55, .12)";                       // soft shadow
    this.style.background = "#FFFFFF";                                               // white bg
    this.style.transform = "scale(1.05)";                                            // grow 5%
  };
  categoryCards[k].onmouseout = function () {                                        // hover out
    this.style.borderColor = "";                                                     // reset all four
    this.style.boxShadow = "";
    this.style.background = "";
    this.style.transform = "";
  };
}

// ---------- B9 Category / Recommendation / Essentials tiles: image zoom on hover ----------
var zoomTiles = document.querySelectorAll(                                           // every tile with a
  ".category-card, #recommendation .card, #essentials .card, .reco-style .card"                         // full-bleed photo
);
for (var z = 0; z < zoomTiles.length; z++) {                                         // loop each tile
  (function (tile) {                                                                 // capture tile
    var photo = tile.querySelector("img");                                           // its background photo
    if (!photo) return;                                                              // skip if none
    tile.onmouseover = function () { photo.style.transform = "scale(1.08)"; };       // hover in: zoom
    tile.onmouseout  = function () { photo.style.transform = ""; };                  // hover out: reset
    tile.onfocus     = function () { photo.style.transform = "scale(1.08)"; };       // keyboard focus in
    tile.onblur      = function () { photo.style.transform = ""; };                  // keyboard focus out
  })(zoomTiles[z]);
}

// ---------- B10 Add to Cart buttons: darker green on hover (only if enabled) ----------
var cartButtons = document.getElementsByClassName("add-to-cart");                    // all buy buttons
for (var n = 0; n < cartButtons.length; n++) {                                       // loop each
  cartButtons[n].onmouseover = function () {                                         // hover in
    if (!this.disabled) this.style.background = "#1F4A37";                           // darken if enabled
  };
  cartButtons[n].onmouseout = function () { this.style.background = ""; };           // reset out
}

// ---------- B11 Nav search: type a product name -> jump straight to that product (by its id) ----------
(function () {
  var forms = document.querySelectorAll("form.nav-search");                          // every nav search box
  if (!forms.length) return;                                                         // none on this page

  // Every product: file + id (the same id used in the page's #hash) + display name
  var CAT = {
    "personal-care":      { page: "category-personal-care.html",    label: "Personal Care",        kw: "natural self care" },
    "bags-accessories":   { page: "category-bags-accessories.html", label: "Bags & Accessories",   kw: "bag tote reusable" },
    "home-products":      { page: "category-home-products.html",    label: "Home Products",        kw: "home house kitchen" },
    "gardening-plants":   { page: "category-gardening-plants.html", label: "Gardening & Plants",   kw: "garden plant organic" },
    "school-office":      { page: "category-school-office.html",    label: "School & Office",      kw: "school office recycled" }
  };
  var PRODUCTS = [
    { id: "bamboo-toothbrush",   name: "Bamboo Toothbrush Set",      cat: "personal-care" },
    { id: "wooden-comb",         name: "Wooden Comb",                cat: "personal-care" },
    { id: "handmade-soap",       name: "Natural Handmade Soap",      cat: "personal-care" },
    { id: "abaca-fiber-bag",     name: "Abaca Fiber Bag",            cat: "bags-accessories" },
    { id: "recycled-paper-bags", name: "Recycled Paper Bags",        cat: "bags-accessories" },
    { id: "reusable-tote-bag",   name: "Reusable Tote Bag",          cat: "bags-accessories" },
    { id: "rattan-storage-boxes",name: "Rattan Storage Boxes",       cat: "home-products" },
    { id: "cleaning-products",   name: "Natural Cleaning Products",  cat: "home-products" },
    { id: "soy-wax-candles",     name: "Soy Wax Candles",            cat: "home-products" },
    { id: "slippers",            name: "Handmade House Slippers",    cat: "home-products" },
    { id: "reusable-straw",      name: "Reusable Straw Set",         cat: "home-products" },
    { id: "wooden-utensils",     name: "Wooden Utensil Set",         cat: "home-products" },
    { id: "water-bottle",        name: "Stainless Water Bottle",     cat: "home-products" },
    { id: "seed-paper",          name: "Plantable Seed Paper",       cat: "gardening-plants" },
    { id: "plant-pots",          name: "Biodegradable Plant Pots",   cat: "gardening-plants" },
    { id: "organic-fertilizer",  name: "Organic Fertilizer",         cat: "gardening-plants" },
    { id: "pencil-case",         name: "Recycled Pencil Case",       cat: "school-office" },
    { id: "ruler",               name: "Bamboo Ruler",               cat: "school-office" },
    { id: "bamboo-pens",         name: "Bamboo Pens Set",            cat: "school-office" }
  ];

  function norm(t) {                                                                 // lowercase, letters/numbers only
    return String(t).toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  }
  function stem(w) {                                                                 // "pens" -> "pen", "candles" -> "candle"
    return w.length > 3 && w.charAt(w.length - 1) === "s" ? w.slice(0, -1) : w;
  }
  function tokens(t) {
    var parts = norm(t).split(" "), out = [];
    for (var i = 0; i < parts.length; i++) if (parts[i]) out.push(stem(parts[i]));
    return out;
  }

  function buildResults(query) {                                                     // returns [{score, label, sub, url}]
    var q = norm(query), qt = tokens(query), res = [];
    if (!q) return res;
    var i, j;

    for (i = 0; i < PRODUCTS.length; i++) {                                          // products first
      var p = PRODUCTS[i], c = CAT[p.cat];
      var name = norm(p.name), idWords = p.id.replace(/-/g, " ");
      var hay = tokens(p.name + " " + idWords + " " + c.label + " " + c.kw);
      var score = 0;
      if (q === name || q === idWords) score = 100;                                  // exact name or id
      else if (name.indexOf(q) === 0) score = 80;                                    // name starts with it
      else if (name.indexOf(q) > -1 || idWords.indexOf(q) > -1) score = 60;          // name contains it
      else {
        var all = true;                                                              // every word appears somewhere
        for (j = 0; j < qt.length; j++) if (hay.indexOf(qt[j]) < 0) { all = false; break; }
        if (all) score = 40;
      }
      if (score) res.push({ score: score, label: p.name, sub: c.label,
                            url: c.page + "#" + p.id });                             // page + product id
    }

    for (var key in CAT) {                                                           // then whole categories
      var cat = CAT[key], cn = norm(cat.label), cscore = 0;
      if (q === cn) cscore = 100;
      else if (cn.indexOf(q) > -1) cscore = 50;
      if (cscore) res.push({ score: cscore, label: cat.label, sub: "Category", url: cat.page });
    }

    res.sort(function (a, b) { return b.score - a.score; });                         // best match first
    return res;
  }

  function wire(form) {
    var input = form.querySelector("input[type='search']");
    var box = document.createElement("div");                                         // results dropdown
    box.className = "nav-search-results";
    box.hidden = true;
    form.appendChild(box);

    function close() { box.hidden = true; box.innerHTML = ""; }
    function go(url) { window.location.href = url; }

    form.addEventListener("submit", function (e) {
      e.preventDefault();                                                            // stay on the site
      var query = input.value;
      if (!norm(query)) { close(); return; }
      var res = buildResults(query);

      if (res.length === 1 || (res.length > 1 && res[0].score === 100 && res[1].score < 100)) {
        go(res[0].url);                                                              // one clear match: go there
        return;
      }

      box.innerHTML = "";                                                            // otherwise show choices
      if (!res.length) {
        var none = document.createElement("p");
        none.className = "nav-search-none";
        none.textContent = "No products found for \u201C" + query.trim() + "\u201D.";
        box.appendChild(none);
      } else {
        for (var i = 0; i < res.length && i < 8; i++) {
          var a = document.createElement("a");
          a.href = res[i].url;
          a.innerHTML = "<strong></strong><span></span>";
          a.firstChild.textContent = res[i].label;
          a.lastChild.textContent = res[i].sub;
          box.appendChild(a);
        }
      }
      box.hidden = false;
    });

    input.addEventListener("input", close);                                          // typing clears old results
    document.addEventListener("click", function (e) { if (!form.contains(e.target)) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  }

  for (var f = 0; f < forms.length; f++) wire(forms[f]);                             // set up each search box
})();


/* =========================================================
   js/03-homepage.js - PART C - HOMEPAGE (homepage.html)
   ========================================================= */

// =========================================================
// PART C - HOMEPAGE (homepage.html)
// =========================================================

// ---------- C1 "Read more about our story" toggle ----------
(function () {                                                                       // private scope
  var storyLink = document.getElementById("toggle-story");                           // the link
  if (!storyLink) return;                                                            // not on homepage → exit

  storyLink.addEventListener("click", function (e) {                                 // on click
    e.preventDefault();                                                              // stop default jump
    var story = document.getElementById("ourStory");                                 // hidden block
    if (story.style.display === "none") {                                            // hidden?
      story.style.display = "block";                                                 // show
      storyLink.textContent = "Hide our story \u2191";                               // link → "Hide ↑"
    } else {                                                                         // visible?
      story.style.display = "none";                                                  // hide
      storyLink.textContent = "Read more about our story \u2193";                    // link → "Read ↓"
    }
  });
})();

// ---------- C2 Vetting pillars accordion (expands on hover/focus only) ----------
(function () {                                                                       // private scope
  var grid = document.getElementById("pillarGrid");                                  // accordion container
  if (!grid) return;                                                                 // not on this page → exit

  var panels = grid.querySelectorAll(".pillar");                                     // each panel
  if (!panels.length) return;                                                        // nothing to wire up

  panels.forEach(function (panel) {                                                 // wire each panel
    panel.addEventListener("mouseenter", function () {                              // cursor moves over it
      panel.classList.add("is-active");                                             // expand this panel
    });
    panel.addEventListener("mouseleave", function () {                              // cursor leaves it
      panel.classList.remove("is-active");                                          // collapse back
    });
    panel.addEventListener("focus", function () {                                   // keyboard focus in
      panel.classList.add("is-active");                                             // expand this panel
    });
    panel.addEventListener("blur", function () {                                    // keyboard focus out
      panel.classList.remove("is-active");                                          // collapse back
    });
  });
})();

// ---------- C4 Newsletter email validation ----------
(function () {                                                                       // private scope
  var form  = document.querySelector(".newsletter-form");                            // the form
  var email = document.getElementById("newsletterEmail");                            // email input
  if (!form || !email) return;                                                       // not on homepage

  var pattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;                                     // simple email regex

  form.addEventListener("submit", function (e) {                                     // on submit
    var value = email.value.trim();                                                  // trim input
    if (!pattern.test(value)) {                                                      // bad email?
      e.preventDefault();                                                            // stop submit
      alert("Please enter a valid email address, e.g. name@example.com.");           // alert
      email.focus();                                                                 // focus field
      email.style.borderColor = "#FF6B6B";                                           // red border
      return;                                                                        // stop
    }
    email.style.borderColor = "";                                                    // clear on valid
  });

  email.addEventListener("input", function () {                                      // while typing
    email.style.borderColor = "";                                                    // clear red border
  });
})();


/* =========================================================
   js/04-category-pages.js - PART D - CATEGORY PAGES (category-*.html)
   ========================================================= */

// =========================================================
// PART D - CATEGORY PAGES (category-*.html)
// =========================================================

// ---------- D1 Show one product at a time ----------
(function () {                                                                       // private scope
  var article = document.querySelector("article");                                   // main article
  if (!article) return;                                                              // exit if none

  var details = article.querySelectorAll(".product-detail");                         // all product blocks
  if (!details.length) return;                                                       // exit if none

  var browseBlocks = article.querySelectorAll(".card-container, .details-heading");  // grid + heading

  function showOnly(id) {                                                            // show one detail
    var found = false;                                                               // track match
    for (var i = 0; i < details.length; i++) {                                       // loop details
      if (id && details[i].id === id) {                                              // matches?
        details[i].classList.add("is-visible");                                      // show
        found = true;                                                                // flag
      } else {                                                                        // not a match
        details[i].classList.remove("is-visible");                                   // hide
      }
    }
    for (var j = 0; j < browseBlocks.length; j++) {                                  // loop grid/heading
      browseBlocks[j].style.display = found ? "none" : "";                           // hide if viewing
    }
    article.classList.toggle("viewing-product", found);                              // flag for CSS
  }

  function fromHash() {                                                              // read URL hash
    var id = location.hash.replace("#", "");                                         // strip '#'
    showOnly(id);                                                                    // show matching
    if (id) window.scrollTo(0, 0);                                                   // scroll top
  }

  var productCards = article.querySelectorAll(".card");                              // all cards
  for (var k = 0; k < productCards.length; k++) {                                    // loop cards
    productCards[k].addEventListener("click", function (e) {                         // on click
      var href = this.getAttribute("href") || "";                                    // read href
      if (href.charAt(0) !== "#") return;                                            // ignore full links
      e.preventDefault();                                                            // stop jump
      var id = href.slice(1);                                                        // strip '#'
      history.pushState(null, "", "#" + id);                                         // update URL
      showOnly(id);                                                                  // show detail
      window.scrollTo(0, 0);                                                         // scroll top
    });
  }

  var backTos = article.querySelectorAll(".back-to-products");                       // back links
  for (var b = 0; b < backTos.length; b++) {                                         // loop them
    backTos[b].addEventListener("click", function (e) {                              // on click
      e.preventDefault();                                                            // stop jump
      history.pushState(null, "", location.pathname + location.search);              // clear hash
      showOnly("");                                                                  // show grid again
      window.scrollTo(0, 0);                                                         // scroll top
    });
  }

  window.addEventListener("hashchange", fromHash);                                   // hash changed
  window.addEventListener("popstate", fromHash);                                     // back/forward
  fromHash();                                                                        // run on load
})();

// ---------- D2 Choose For Me + Add to Cart + live total (called from inline onclick/oninput) ----------
function chooseForMe(btn) {                                                          // random pick
  var form = btn.closest('form');                                                    // the form
  if (!form) return;                                                                 // guard

  var customizations = form.querySelectorAll('input[name="Customizations"]');        // checkbox group
  for (var i = 0; i < customizations.length; i++) {                                  // loop
    customizations[i].checked = Math.random() > 0.5;                                 // 50/50
  }

  var addons = form.querySelectorAll('input[name="Addons"]');                        // add-ons
  for (var j = 0; j < addons.length; j++) {                                          // loop
    addons[j].checked = Math.random() > 0.5;                                         // 50/50
  }

  var packaging = form.querySelectorAll('input[name="Packaging"]');                  // radios
  if (packaging.length > 0) {                                                        // if any
    packaging[Math.floor(Math.random() * packaging.length)].checked = true;          // pick one
  }

  var variant = form.querySelector('select[name="Variant"]');                        // dropdown
  if (variant) {                                                                     // if exists
    variant.selectedIndex = Math.floor(Math.random() * variant.options.length);      // pick one
  }

  var qty = form.querySelector('input[name="Qty"]');                                 // qty input
  if (qty) {                                                                         // if exists
    qty.value = Math.floor(Math.random() * 5) + 1;                                   // 1..5
    updatePrice(qty);                                                                // refresh total
  }

  alert('Random selections made for you!');                                          // notify
}

function addToCart(btn) {                                                            // Buy Now
  var form = btn.closest('form');                                                    // the form
  if (!form) return;                                                                 // guard

  var basePrice = parseFloat(form.getAttribute('data-price'));                       // base price
  if (isNaN(basePrice)) basePrice = 0;                                               // guard

  var qtyInput = form.querySelector('input[name="Qty"]');                            // qty field
  var qty = qtyInput ? parseInt(qtyInput.value, 10) : 1;                             // read qty
  if (isNaN(qty) || qty < 1) qty = 1;                                                // min 1

  var variantEl = form.querySelector('select[name="Variant"]');                      // variant dropdown
  var variant = variantEl ? variantEl.value : '';                                    // read variant

  var detail = btn.closest('.product-detail');                                       // product wrapper
  var nameEl = detail ? detail.querySelector('.product-info h3') : null;             // product title
  var name = nameEl ? nameEl.textContent.trim() : 'Product';                         // fallback name

  var id = detail ? detail.id : '';                                                  // product id (e.g. "wooden-comb")
  var imgEl = detail ? detail.querySelector('.gallery-slide') : null;                // first gallery photo
  var image = imgEl ? imgEl.getAttribute('src') : '';                                // path used on cart page

  cartAddItem({ id: id, name: name, variant: variant, price: basePrice, qty: qty, image: image }); // push into shared cart
  showCartToast('\u2713 Added to cart!');                                           // small success message
}                                                                                     // (Add to Cart / Buy Now decide what happens next)

function updatePrice(inputElement) {                                                 // live total
  var form = inputElement.closest('form');                                           // the form
  if (!form) return;                                                                 // guard

  var basePrice = parseFloat(form.getAttribute('data-price'));                       // base price
  if (isNaN(basePrice)) return;                                                      // guard

  var qty = parseInt(inputElement.value, 10);                                        // qty
  if (isNaN(qty) || qty < 1) qty = 1;                                                // min 1

  var total = basePrice * qty;                                                       // price × qty

  var display = form.querySelector('.total-price-display');                          // "Total: ₱" span
  if (display) {                                                                     // if exists
    display.textContent = 'Total: ₱' + total.toLocaleString('en-PH');                // update
  }
}

// ---------- D3 Prevent product-form reloads (fixes double alert) ----------
document.querySelectorAll(".add-to-cart-form-container form").forEach(function (form) {
  form.addEventListener("submit", function (e) {                                     // on any product form submit
    e.preventDefault();                                                              // stop page reload
    // (adding to the cart itself is handled by addToCart(), see §11)
  });
});

// ---------- D4 Product image galleries (thumbnail picker, no auto-rotate) ----------
(function () {                                                                       // private scope
  var galleries = document.querySelectorAll(".product-gallery");                     // every product gallery
  if (!galleries.length) return;                                                     // none on this page → exit

  galleries.forEach(function (gallery) {                                             // set up each gallery
    var track   = gallery.querySelector(".gallery-track");                           // main image stack
    var slides  = gallery.querySelectorAll(".gallery-slide");                        // all images
    var prevBtn = gallery.querySelector(".gallery-prev");                            // previous arrow
    var nextBtn = gallery.querySelector(".gallery-next");                            // next arrow
    if (!track || slides.length < 1) return;                                         // nothing to show

    // wrap the big image + arrows in a "stage" so the thumbnail strip can sit below it
    var stage = document.createElement("div");                                       // stage wrapper
    stage.className = "gallery-stage";                                               // styled in style.css
    gallery.insertBefore(stage, track);                                              // put stage where track was
    stage.appendChild(track);                                                        // move main image in
    if (prevBtn) stage.appendChild(prevBtn);                                         // move arrows in
    if (nextBtn) stage.appendChild(nextBtn);                                         // move arrows in

    // build the clickable thumbnail strip from the same images
    var thumbsWrap = document.createElement("div");                                  // thumbnail row
    thumbsWrap.className = "gallery-thumbs";                                         // styled in style.css
    var thumbs = [];                                                                 // thumb buttons
    var current = 0;                                                                 // active index

    function goTo(index) {                                                           // show a given image
      slides[current].classList.remove("is-active");                                 // hide old image
      thumbs[current].classList.remove("is-active");                                 // un-highlight old thumb
      thumbs[current].setAttribute("aria-current", "false");                         // a11y
      current = (index + slides.length) % slides.length;                            // wrap around
      slides[current].classList.add("is-active");                                    // show new image
      thumbs[current].classList.add("is-active");                                    // highlight new thumb
      thumbs[current].setAttribute("aria-current", "true");                          // a11y
      thumbs[current].scrollIntoView({ block: "nearest", inline: "nearest" });       // keep it visible in strip
    }

    slides.forEach(function (slide, i) {                                             // one thumb per image
      var btn = document.createElement("button");                                    // thumb button
      btn.type = "button";                                                           // not a submit
      btn.className = "gallery-thumb" + (i === 0 ? " is-active" : "");               // first is active
      btn.setAttribute("aria-label", "Show image " + (i + 1));                       // a11y label
      btn.setAttribute("aria-current", i === 0 ? "true" : "false");                  // a11y state
      var img = document.createElement("img");                                       // small preview
      img.src = slide.getAttribute("src");                                           // same photo
      img.alt = "";                                                                  // decorative
      btn.appendChild(img);                                                          // put img in button
      btn.addEventListener("click", function () { goTo(i); });                       // choose this image
      thumbsWrap.appendChild(btn);                                                   // add to strip
      thumbs.push(btn);                                                              // remember it
    });
    gallery.appendChild(thumbsWrap);                                                 // strip goes under the stage

    if (slides.length < 2) {                                                         // single image:
      if (prevBtn) prevBtn.hidden = true;                                            // no arrows needed
      if (nextBtn) nextBtn.hidden = true;                                            // no arrows needed
      return;                                                                        // nothing to navigate
    }

    if (nextBtn) nextBtn.addEventListener("click", function () { goTo(current + 1); }); // next image
    if (prevBtn) prevBtn.addEventListener("click", function () { goTo(current - 1); }); // previous image
  });
})();

// ---------- D5 Category product cards: heart toggles without opening the product ----------
document.addEventListener("click", function (e) {                                    // one listener for all hearts
  var heart = e.target.closest ? e.target.closest(".card-heart") : null;             // clicked a heart?
  if (!heart) return;                                                                // no: ignore
  e.preventDefault();                                                                // don't follow the card link
  e.stopPropagation();                                                               // don't open the detail view
  var on = heart.classList.toggle("is-on");                                          // flip saved state
  heart.setAttribute("aria-pressed", on ? "true" : "false");                         // tell screen readers
}, true);                                                                            // capture: runs before the card's own click
document.addEventListener("keydown", function (e) {                                  // keyboard: Enter / Space
  if (e.key !== "Enter" && e.key !== " ") return;                                    // only those keys
  var heart = e.target.closest ? e.target.closest(".card-heart") : null;             // focused heart?
  if (heart) { e.preventDefault(); heart.click(); }                                  // act like a click
});


/* =========================================================
   js/05-cart-page.js - PART E1 - CART PAGE (cart.html)
   ========================================================= */

// =========================================================
// PART E - CART PAGE (cart.html)
// =========================================================

// ---------- E1 Cart page: list, quantity, remove, clear, totals ----------
// Uses the same localStorage cart as A1 (key "likhaluntianCart"). Does nothing on other pages.
(function () {
  "use strict";

  var STORAGE_KEY = "likhaluntianCart";      // must match script.js
  var BALAYAN_KEY = "likhaluntianBalayan";   // remembers the delivery checkbox
  var SHIPPING_FEE = 100;                    // flat shipping (PHP)
  var FREE_SHIPPING_MIN = 1500;              // free delivery threshold (Balayan only, per site banner)
  var MAX_QTY = 99;
  var FALLBACK_IMG = "../assets/logo.png";

  var listEl = document.getElementById("cartItems");
  if (!listEl) return;                       // not on the cart page

  var contentEl  = document.getElementById("cartContent");
  var emptyEl    = document.getElementById("cartEmpty");
  var headingEl  = document.getElementById("cartHeading");
  var statusEl   = document.getElementById("cartStatus");
  var subtotalEl = document.getElementById("summarySubtotal");
  var shippingEl = document.getElementById("summaryShipping");
  var totalEl    = document.getElementById("summaryTotal");
  var noteEl     = document.getElementById("shippingNote");
  var balayanEl  = document.getElementById("balayanCheck");
  var checkoutEl = document.getElementById("checkoutBtn");
  var clearEl    = document.getElementById("cartClearBtn");
  var msgEl      = document.getElementById("checkoutMsg");

  var items = [];
  var selfUpdate = false;                    // stops script.js -> cartPageRender loops

  /* ---------- formatting ---------- */
  var fmt = null;
  try { fmt = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }); } catch (e) { fmt = null; }
  function peso(n) {
    n = Math.round(n * 100) / 100;
    if (fmt) return fmt.format(n);
    return "\u20b1" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  /* ---------- storage (defensive) ---------- */
  function readRaw() {
    try {
      var data = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(data) ? data : [];
    } catch (e) { return []; }               // empty / corrupted / storage blocked
  }
  function save(list) {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
  }
  function syncNav() {                       // refresh nav badge + dropdown (script.js)
    selfUpdate = true;
    try { if (typeof window.cartRender === "function") window.cartRender(); } catch (e) { /* ignore */ }
    selfUpdate = false;
  }

  function loadCart() {                      // validate every line; drop what is unusable
    var clean = [], changed = false;
    readRaw().forEach(function (it) {
      var name = it && typeof it.name === "string" ? it.name.trim() : "";
      var price = Number(it && it.price);
      var qty = parseInt(it && it.qty, 10);
      if (!name || !isFinite(price) || price < 0) { changed = true; return; }   // missing name / bad price
      if (!(qty >= 1)) { qty = 1; changed = true; }
      if (qty > MAX_QTY) { qty = MAX_QTY; changed = true; }
      clean.push({
        id: it.id ? String(it.id) : "",
        name: name,
        variant: it.variant ? String(it.variant) : "",
        price: price,
        qty: qty,
        image: typeof it.image === "string" ? it.image : ""
      });
    });
    if (changed) { save(clean); syncNav(); }
    return clean;
  }

  /* ---------- small helpers ---------- */
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function say(text) { if (statusEl) statusEl.textContent = text; }
  function clearMsg() { if (msgEl) { msgEl.hidden = true; msgEl.textContent = ""; } }

  /* ---------- summary ---------- */
  function shippingFor(subtotal) {
    if (subtotal <= 0) return 0;
    if (balayanEl && balayanEl.checked && subtotal >= FREE_SHIPPING_MIN) return 0;
    return SHIPPING_FEE;
  }
  function updateSummary() {
    var subtotal = items.reduce(function (s, it) { return s + it.price * it.qty; }, 0);
    var shipping = shippingFor(subtotal);
    subtotalEl.textContent = peso(subtotal);
    shippingEl.textContent = subtotal > 0 && shipping === 0 ? "Free" : peso(shipping);
    totalEl.textContent = peso(subtotal + shipping);

    if (balayanEl && balayanEl.checked) {
      noteEl.textContent = subtotal >= FREE_SHIPPING_MIN
        ? "Free delivery in Balayan applied."
        : "Add " + peso(FREE_SHIPPING_MIN - subtotal) + " more for free delivery in Balayan.";
    } else {
      noteEl.textContent = "Free delivery in Balayan on orders over " + peso(FREE_SHIPPING_MIN) + ".";
    }
  }

  function commit() {                        // after any change
    save(items);
    syncNav();
    updateSummary();
    clearMsg();
  }

  /* ---------- rows ---------- */
  function buildRow(item) {
    var label = item.name + (item.variant ? " (" + item.variant + ")" : "");
    var li = el("li", "cart-row");

    // product cell
    var prod = el("div", "cart-cell cart-product");
    var img = document.createElement("img");
    img.className = "cart-thumb";
    img.alt = item.name;
    img.loading = "lazy";
    img.addEventListener("error", function () {
      if (img.getAttribute("src") !== FALLBACK_IMG) { img.classList.add("is-fallback"); img.src = FALLBACK_IMG; }
    });
    if (item.image) { img.src = item.image; } else { img.classList.add("is-fallback"); img.src = FALLBACK_IMG; }
    var info = el("div", "cart-info");
    info.appendChild(el("h3", "", item.name));
    if (item.variant) info.appendChild(el("span", "cart-variant", item.variant));
    info.appendChild(el("span", "cart-unit-price", peso(item.price)));   // shown on mobile only
    prod.appendChild(img);
    prod.appendChild(info);

    // price cell (desktop)
    var priceCell = el("div", "cart-cell cart-price", peso(item.price));
    priceCell.setAttribute("data-label", "Price");

    // quantity cell
    var qtyCell = el("div", "cart-cell cart-qty");
    qtyCell.setAttribute("data-label", "Quantity");
    var group = el("div", "qty-control");
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", "Quantity for " + label);
    var minus = el("button", "qty-btn", "\u2212");
    minus.type = "button";
    minus.setAttribute("aria-label", "Decrease quantity of " + label);
    var value = el("span", "qty-value");
    var plus = el("button", "qty-btn", "+");
    plus.type = "button";
    plus.setAttribute("aria-label", "Increase quantity of " + label);
    group.appendChild(minus); group.appendChild(value); group.appendChild(plus);
    qtyCell.appendChild(group);

    // subtotal cell
    var subCell = el("div", "cart-cell cart-subtotal");
    subCell.setAttribute("data-label", "Subtotal");

    // remove cell
    var remove = el("button", "cart-remove", "Remove");
    remove.type = "button";
    remove.setAttribute("aria-label", "Remove " + label + " from cart");

    function refresh() {                     // update this row in place (keeps keyboard focus)
      value.textContent = item.qty;
      subCell.textContent = peso(item.price * item.qty);
      minus.disabled = item.qty <= 1;        // never below 1 — use Remove instead
      plus.disabled = item.qty >= MAX_QTY;
    }
    function change(delta) {
      var next = item.qty + delta;
      if (next < 1 || next > MAX_QTY) return;
      item.qty = next;
      commit();
      refresh();
      say(label + ": quantity " + item.qty + ", subtotal " + peso(item.price * item.qty));
    }
    minus.addEventListener("click", function () { change(-1); });
    plus.addEventListener("click", function () { change(1); });
    remove.addEventListener("click", function () {
      var at = items.indexOf(item);
      if (at > -1) items.splice(at, 1);
      commit();
      render(true);
      say(label + " removed from cart.");
    });

    refresh();
    li.appendChild(prod); li.appendChild(priceCell); li.appendChild(qtyCell);
    li.appendChild(subCell); li.appendChild(remove);
    return li;
  }

  function render(keepItems) {
    if (!keepItems) items = loadCart();
    listEl.textContent = "";
    var has = items.length > 0;
    contentEl.hidden = !has;
    emptyEl.hidden = has;
    if (!has) return;
    items.forEach(function (item) { listEl.appendChild(buildRow(item)); });
    updateSummary();
  }

  /* ---------- buttons ---------- */
  checkoutEl.addEventListener("click", function () {
    if (typeof window.addressCheckout === "function" && !window.addressCheckout()) {   // need a saved delivery address first
      msgEl.hidden = true;
      return;
    }
    window.location.href = "checkout.html"; return;
    msgEl.hidden = false;
  });

  clearEl.addEventListener("click", function () {
    if (!window.confirm("Are you sure you want to clear your cart?")) return;
    items = [];
    commit();
    render(true);
    say("Your cart is now empty.");
    if (headingEl) headingEl.focus();
  });

  if (balayanEl) {
    try { balayanEl.checked = window.localStorage.getItem(BALAYAN_KEY) === "1"; } catch (e) { /* ignore */ }
    balayanEl.addEventListener("change", function () {
      try { window.localStorage.setItem(BALAYAN_KEY, balayanEl.checked ? "1" : "0"); } catch (e) { /* ignore */ }
      updateSummary();
    });
  }

  /* ---------- keep in sync ---------- */
  window.cartPageRender = function () { if (!selfUpdate) render(); };   // called by script.js cartRender()
  window.addEventListener("storage", function (e) {                    // cart changed in another tab
    if (e.key === STORAGE_KEY || e.key === null) render();
  });
  window.addEventListener("pageshow", function (e) { if (e.persisted) render(); });   // back/forward cache

  render();
})();


/* =========================================================
   js/06-delivery-address.js - PART E2 - DELIVERY ADDRESS (cart.html)
   ========================================================= */

// ---------- E2 Delivery address ----------
// Region (NCR / Batangas) -> City/Municipality dropdown, everything else typed.
// Saved in localStorage ("likhaLuntianBuyerAddress"). Barangay is ALWAYS free text.
(function () {
  var form = document.getElementById("addressForm");
  if (!form) return;                                   // not on the cart page

  var KEY = "likhaLuntianBuyerAddress";
  var CITIES = {
    "NCR": ["Caloocan", "Las Pi\u00f1as", "Makati", "Malabon", "Mandaluyong", "Manila", "Marikina",
            "Muntinlupa", "Navotas", "Para\u00f1aque", "Pasay", "Pasig", "Pateros", "Quezon City",
            "San Juan", "Taguig", "Valenzuela"],
    "Batangas": ["Agoncillo", "Alitagtag", "Balayan", "Balete", "Batangas City", "Bauan", "Calaca",
                 "Calatagan", "Cuenca", "Ibaan", "Laurel", "Lemery", "Lian", "Lipa", "Lobo", "Mabini",
                 "Malvar", "Mataasnakahoy", "Nasugbu", "Padre Garcia", "Rosario", "San Jose", "San Juan",
                 "San Luis", "San Nicolas", "San Pascual", "Santa Teresita", "Santo Tomas", "Taal",
                 "Talisay", "Tanauan", "Taysan", "Tingloy", "Tuy"]
  };
  var IDS = { fullName: "addrName", mobile: "addrMobile", email: "addrEmail", region: "addrRegion",
              city: "addrCity", barangay: "addrBarangay", houseNumber: "addrHouse", street: "addrStreet",
              building: "addrBuilding", postalCode: "addrPostal", instructions: "addrNotes" };
  var ORDER = ["fullName", "mobile", "email", "region", "city", "barangay", "houseNumber", "street", "building", "postalCode"];

  var sectionEl = document.getElementById("addressSection");
  var summaryEl = document.getElementById("addressSummary");
  var summaryText = document.getElementById("addressSummaryText");
  var savedMsg = document.getElementById("addressSavedMsg");
  var formMsg = document.getElementById("addressFormMsg");
  var editBtn = document.getElementById("addressEditBtn");
  var cancelBtn = document.getElementById("addressCancelBtn");
  var regionEl = document.getElementById(IDS.region);
  var cityEl = document.getElementById(IDS.city);

  var saved = null;            // last valid saved address (object) or null
  var mode = "hidden";         // "hidden" | "summary" | "form"
  var unserved = false;        // a stored address pointed outside NCR/Batangas

  function field(key) { return document.getElementById(IDS[key]); }

  /* ----- city dropdown ----- */
  function fillCities(region, selected) {
    cityEl.textContent = "";
    var list = CITIES[region];
    var first = document.createElement("option");
    first.value = "";
    first.textContent = list ? "Select City / Municipality" : "Select Region first";
    cityEl.appendChild(first);
    (list || []).forEach(function (name) {
      var o = document.createElement("option");
      o.value = name; o.textContent = name;
      cityEl.appendChild(o);
    });
    cityEl.disabled = !list;
    cityEl.value = (list && list.indexOf(selected) > -1) ? selected : "";   // never keep an old city
  }

  /* ----- validation ----- */
  function validate(a) {
    var e = {};
    if (!a.fullName) e.fullName = "Please enter your full name.";
    if (!a.mobile) e.mobile = "Please enter your mobile number.";
    else if (!/^(\+?63|0)9\d{9}$/.test(a.mobile.replace(/[\s\-().]/g, ""))) e.mobile = "Please enter a valid Philippine mobile number (e.g., 0912 345 6789).";
    if (a.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(a.email)) e.email = "Please enter a valid email address.";
    if (!a.region) e.region = "Please select your delivery region.";
    else if (!CITIES.hasOwnProperty(a.region)) e.region = "Sorry, we currently deliver only to NCR and Batangas.";
    if (!a.city) e.city = "Please select your city/municipality.";
    else if (CITIES[a.region] && CITIES[a.region].indexOf(a.city) === -1) e.city = "Please select a city/municipality in " + a.region + ".";
    if (!a.barangay) e.barangay = "Please enter your barangay.";
    if (!a.houseNumber) e.houseNumber = "Please enter your house/unit number.";
    if (!a.street) e.street = "Please enter your street.";
    if (a.postalCode && !/^\d{4}$/.test(a.postalCode)) e.postalCode = "Postal code must be 4 digits (e.g., 1121).";
    return e;
  }
  function isValid(a) { return !!a && Object.keys(validate(a)).length === 0; }

  function clearError(key) {
    var f = field(key), p = document.getElementById("err-" + IDS[key]);
    if (f) { f.removeAttribute("aria-invalid"); f.removeAttribute("aria-describedby"); }
    if (p) { p.hidden = true; p.textContent = ""; }
  }
  function clearErrors() { ORDER.forEach(clearError); formMsg.hidden = true; formMsg.textContent = ""; }
  function showErrors(errors) {
    clearErrors();
    var firstEl = null;
    ORDER.forEach(function (key) {
      if (!errors[key]) return;
      var f = field(key), p = document.getElementById("err-" + IDS[key]);
      p.textContent = errors[key]; p.hidden = false;
      f.setAttribute("aria-invalid", "true");
      f.setAttribute("aria-describedby", p.id);
      if (!firstEl) firstEl = f;
    });
    if (firstEl) firstEl.focus();
  }

  /* ----- read / write ----- */
  function readForm() {
    var a = {};
    Object.keys(IDS).forEach(function (key) { a[key] = field(key).value.trim(); });
    return a;
  }
  function writeForm(a) {
    Object.keys(IDS).forEach(function (key) { if (key !== "city") field(key).value = a[key] || ""; });
    fillCities(a.region, a.city);
  }
  function loadSaved() {
    try {
      var raw = JSON.parse(window.localStorage.getItem(KEY));
      if (!raw || typeof raw !== "object") return null;
      var a = {};
      Object.keys(IDS).forEach(function (key) { a[key] = typeof raw[key] === "string" ? raw[key].trim() : ""; });
      return a;
    } catch (err) { return null; }                      // empty / corrupted / blocked
  }
  function persist(a) {
    try { window.localStorage.setItem(KEY, JSON.stringify(a)); return true; } catch (err) { return false; }
  }

  /* ----- views ----- */
  function setMode(next) {
    mode = next;
    sectionEl.hidden = next === "hidden";
    summaryEl.hidden = next !== "summary";
    form.hidden = next !== "form";
    cancelBtn.hidden = !(next === "form" && saved);
  }
  function line(parent, text, cls, tag) {
    var n = document.createElement(tag || "span");
    if (cls) n.className = cls;
    n.textContent = text;
    parent.appendChild(n);
    parent.appendChild(document.createElement("br"));
  }
  function renderSummary(a) {
    summaryText.textContent = "";
    line(summaryText, a.fullName, "", "strong");
    line(summaryText, a.mobile);
    line(summaryText, "House/Unit " + a.houseNumber + ", " + a.street);
    if (a.building) line(summaryText, a.building);
    line(summaryText, "Barangay " + a.barangay);
    line(summaryText, a.city + ", " + a.region);
    if (a.postalCode) line(summaryText, a.postalCode);
    if (a.email) line(summaryText, a.email, "addr-note");
    if (a.instructions) line(summaryText, "Note: " + a.instructions, "addr-note");
    summaryText.removeChild(summaryText.lastChild);     // drop trailing <br>
  }

  /* ----- events ----- */
  regionEl.addEventListener("change", function () {     // NCR <-> Batangas resets the city
    fillCities(regionEl.value, "");
    clearError("region"); clearError("city");
  });
  Object.keys(IDS).forEach(function (key) {
    var f = field(key);
    f.addEventListener("input", function () { clearError(key); });
    f.addEventListener("change", function () { clearError(key); });
  });

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var a = readForm(), errors = validate(a);
    if (Object.keys(errors).length) { showErrors(errors); return; }
    clearErrors();
    var ok = persist(a);
    saved = a;
    renderSummary(a);
    savedMsg.textContent = ok ? "\u2713 Address saved." : "Address kept for this visit, but your browser blocked saving it.";
    savedMsg.hidden = false;
    setMode("summary");
    editBtn.focus();
  });

  editBtn.addEventListener("click", function () {
    writeForm(saved || readForm());
    clearErrors();
    savedMsg.hidden = true;
    setMode("form");
    field("fullName").focus();
  });
  cancelBtn.addEventListener("click", function () {
    if (!saved) return;
    writeForm(saved); clearErrors(); setMode("summary");
  });

  // called by the Proceed to Checkout button (section 21): true = address is ready
  window.addressCheckout = function () {
    if (!isValid(saved)) {                              // missing or no longer valid (e.g. region not served)
      if (mode !== "form") { if (saved) writeForm(saved); setMode("form"); }
      var hasInput = Object.keys(IDS).some(function (k) { return field(k).value.trim() !== ""; });
      if (hasInput) { showErrors(validate(readForm())); } else { field("fullName").focus(); }   // only flag fields once the buyer has typed
      formMsg.textContent = ((saved && !CITIES.hasOwnProperty(saved.region)) || unserved)
        ? "Sorry, we currently deliver only to NCR and Batangas."
        : "Please add your delivery address to continue.";
      formMsg.hidden = false;
      sectionEl.scrollIntoView({ behavior: "smooth", block: "start" });
      return false;
    }
    if (mode === "form") {                              // editing but not saved yet
      formMsg.textContent = "Please save your address to continue.";
      formMsg.hidden = false;
      sectionEl.scrollIntoView({ behavior: "smooth", block: "start" });
      return false;
    }
    return true;
  };

  /* ----- start-up: restore a saved address ----- */
  fillCities("", "");
  var stored = loadSaved();
  if (stored) {
    unserved = !!stored.region && !CITIES.hasOwnProperty(stored.region);
    writeForm(stored);
    if (isValid(stored)) { saved = stored; renderSummary(stored); setMode("summary"); return; }
  }
  setMode("hidden");                                     // appears when the buyer clicks Proceed to Checkout
})();


/* =========================================================
   js/07-portal.js - PART F - FORMS / PORTAL (forms.html)
   ========================================================= */

// =========================================================
// PART F - FORMS / PORTAL (forms.html)
// =========================================================

// ---------- F1 Stock Value Calculator ----------
function multiplication(a, b) {                                                      // helper
  return a * b;                                                                      // multiply
}

(function () {                                                                       // private scope
  var form = document.getElementById("stockForm");                                   // the form
  if (!form) return;                                                                 // not on forms page

  var priceEl  = document.getElementById("unitPrice");                               // price input
  var qtyEl    = document.getElementById("stockQty");                                // qty input
  var dateEl   = document.getElementById("restockDate");                             // date input
  var resultEl = document.getElementById("stockResult");                             // output

  form.addEventListener("submit", function (e) {                                     // on submit
    e.preventDefault();                                                              // stop reload
    var price = parseFloat(priceEl.value);                                           // to number
    var qty   = parseInt(qtyEl.value, 10);                                           // to integer

    if (isNaN(price) || isNaN(qty) || price < 0 || qty < 0) {                        // invalid?
      resultEl.style.color = "#B00020";                                              // red
      resultEl.textContent = "Please enter a valid unit price and stock quantity.";
      return;                                                                        // stop
    }

    var total = multiplication(price, qty);                                          // price × qty
    var dateNote = "";                                                               // default empty
    if (dateEl.value) {                                                              // date chosen?
      var d = new Date(dateEl.value + "T00:00:00");                                  // build date
      dateNote = " Restock target: " + d.toDateString() + ".";                       // append note
    }

    resultEl.style.color = "#1E7A4C";                                                // green
    resultEl.textContent =
      "Total stock value: \u20B1" +                                                  // peso sign
      total.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
      "." + dateNote;                                                                // assemble
  });
})();

// ---------- F2 Show/hide password (eye button) ----------
(function () {                                                                       // private scope
  var eyes = document.querySelectorAll("[data-toggle-password]");                    // all eye buttons
  for (var i = 0; i < eyes.length; i++) {                                            // loop them
    eyes[i].addEventListener("click", function () {                                  // on click
      var input = this.parentNode.querySelector("input");                            // sibling input
      if (!input) return;                                                            // safety
      var show = input.type === "password";                                          // currently hidden?
      input.type = show ? "text" : "password";                                       // flip type
      this.setAttribute("aria-pressed", show ? "true" : "false");                    // for CSS icon swap
      this.setAttribute("aria-label", show ? "Hide password" : "Show password");     // for screen readers
    });
  }
})();

// ---------- F3 Portal animations ----------
(function () {                                                                       // private scope
  var grid = document.querySelector(".portal-grid");                                 // menu grid
  if (!grid) return;                                                                 // not on forms page

  var tiles    = grid.querySelectorAll(".portal-tile");                              // menu cards
  var sections = document.querySelectorAll(".portal-section");                       // form cards
  var reduce   = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hoverOK  = window.matchMedia && window.matchMedia("(hover: hover)").matches;   // mouse devices

  // --- 1. Staggered entrance of the menu cards ---
  function playMenu() {                                                              // (re)play entrance
    for (var i = 0; i < tiles.length; i++) {                                         // loop cards
      tiles[i].classList.remove("is-in");                                            // reset
    }
    void grid.offsetWidth;                                                           // force reflow
    for (var j = 0; j < tiles.length; j++) {                                         // loop again
      tiles[j].style.setProperty("--d", (j * 90) + "ms");                            // stagger delay
      tiles[j].classList.add("is-in");                                               // animate in
    }
  }

  if (!reduce) {                                                                     // animate only if allowed
    grid.classList.add("js-anim");                                                   // hide until revealed
    if ("IntersectionObserver" in window) {                                          // reveal on scroll-into-view
      var seen = false;                                                              // play once per view
      var io = new IntersectionObserver(function (entries) {                         // observer callback
        if (entries[0].isIntersecting && !seen) {                                    // visible now
          seen = true;                                                               // remember
          playMenu();                                                                // run entrance
          io.disconnect();                                                           // done observing
        }
      }, { threshold: 0.15 });                                                       // 15% visible
      io.observe(grid);                                                              // start watching
    } else {
      playMenu();                                                                    // old browsers: just show
    }
  } else {
    for (var k = 0; k < tiles.length; k++) tiles[k].classList.add("is-in");          // no motion: show all
  }

  // --- 2. Gentle 3D tilt on cards ---
  if (hoverOK && !reduce) {                                                          // mouse + motion OK
    for (var t = 0; t < tiles.length; t++) {                                         // each card
      (function (tile) {                                                             // closure per card
        tile.addEventListener("pointermove", function (e) {                          // follow the cursor
          var r  = tile.getBoundingClientRect();                                     // card box
          var px = (e.clientX - r.left) / r.width;                                   // 0..1 across
          var py = (e.clientY - r.top) / r.height;                                   // 0..1 down
          tile.style.setProperty("--ry", ((px - 0.5) * 6) + "deg");                  // tilt left/right
          tile.style.setProperty("--rx", ((0.5 - py) * 6) + "deg");                  // tilt up/down
        });
        tile.addEventListener("pointerleave", function () {                          // cursor leaves
          tile.style.setProperty("--rx", "0deg");                                    // untilt
          tile.style.setProperty("--ry", "0deg");                                    // untilt
        });
      })(tiles[t]);
    }
  }

  // --- 3. Form card opens with a staggered rise; menu replays when you go back ---
  function openSection() {                                                           // run on hash change
    var id = location.hash.replace("#", "");                                         // current target
    var target = id ? document.getElementById(id) : null;                            // target element
    if (!target || !target.classList.contains("portal-section")) {                   // no form open
      if (!reduce && grid.classList.contains("js-anim")) playMenu();                 // back to menu
      return;                                                                        // stop
    }
    if (reduce) return;                                                              // no motion
    var items = target.querySelectorAll(".auth-sub, .auth-field, .auth-or, .auth-btn, .auth-fine, h3");
    for (var i = 0; i < items.length; i++) {                                         // number the items
      items[i].style.setProperty("--i", i);                                          // stagger index
    }
    target.classList.remove("is-opening");                                           // reset
    void target.offsetWidth;                                                         // force reflow
    target.classList.add("is-opening");                                              // play
    window.setTimeout(function () {                                                  // clean up after
      target.classList.remove("is-opening");                                         // allow replay
    }, 1400);
  }

  window.addEventListener("hashchange", openSection);                                // on navigation
  if (location.hash) openSection();                                                  // deep link on load

  // --- 4. Calculator result pops when it changes ---
  var result = document.getElementById("stockResult");                               // output <p>
  if (result && "MutationObserver" in window && !reduce) {                           // supported
    new MutationObserver(function () {                                               // text changed
      result.classList.remove("pop");                                                // reset
      void result.offsetWidth;                                                       // reflow
      result.classList.add("pop");                                                   // pop!
    }).observe(result, { childList: true, characterData: true, subtree: true });
  }

  void sections;                                                                     // (kept for clarity)
})();


/* =========================================================
   js/08-about-media.js - PART G - MEDIA / ABOUT (audio player + expand pill)
   ========================================================= */

// =========================================================
// PART G - MEDIA / ABOUT (audio + expand pill)
// =========================================================

// ---------- G1 Audio progress bar ----------
(function () {                                                                       // private scope
  const bar = document.getElementById('bar');                                        // progress bar
  const num = document.getElementById('num');                                        // % text
  const ctl = document.getElementById('ctl');                                        // play/pause img
  const snd = document.getElementById('snd');                                        // audio element

  if (!bar || !num || !ctl || !snd) return;                                          // not on media page

  let run = true;                                                                    // play state

  ctl.onclick = function() {                                                         // click toggle
    (run) ? snd.play() : snd.pause();                                                // play or pause
    run = !run;                                                                      // flip state
  }

  snd.ontimeupdate = function() {                                                    // while playing
    bar.value = (snd.currentTime / snd.duration);                                    // 0..1 progress
    num.innerHTML = Math.floor(100 * bar.value) + '%';                               // show %
  }
})();

// ---------- G2 "Our Story" expand pill (tap support) ----------
(function () {                                                                       // private scope
  var storyPill = document.getElementById("storyExpand");                            // the pill button
  if (!storyPill) return;                                                            // not on media page → exit

  storyPill.addEventListener("click", function () {                                  // tap/click toggles
    var isOpen = storyPill.classList.toggle("is-open");                              // flip state
    storyPill.setAttribute("aria-expanded", isOpen ? "true" : "false");              // update a11y state
  });
})();


/* =========================================================
   js/09-checkout-orders.js - PART H - CHECKOUT, PAYMENT, ORDERS & TRACKING (checkout.html, orders.html)
   ========================================================= */

// =========================================================
// PART H - CHECKOUT, PAYMENT, ORDERS & TRACKING (checkout.html, orders.html)
// =========================================================
/* LikhaLuntian shopping flow: checkout, payment, order history, tracking.
   Loads after script.js (uses cartRead / cartSave / cartRender). No backend: orders live in this browser's localStorage. */
(function () {
  "use strict";
  var OK = "likhaluntianOrders", AK = "likhaLuntianBuyerAddress";
  var STAGES = ["In Cart", "Order Placed", "Confirmed", "Packed", "Shipped", "Out for Delivery", "Delivered"];
  var PAY = {
    gcash: { name: "GCash", note: "Pay with your GCash wallet.", online: true },
    maya: { name: "Maya", note: "Pay with your Maya wallet.", online: true },
    cod: { name: "Cash on Delivery", note: "Pay the rider in cash when your order arrives." },
    bank: { name: "Bank Transfer", note: "Transfer to our account, then tell us once sent. We verify it before confirming." },
    card: { name: "Credit / Debit Card", note: "Not available yet.", off: true }
  };
  var PSTAT = { awaiting: ["Awaiting payment", "wait"], verifying: ["Awaiting verification", "wait"], cod: ["Pay on delivery", "wait"],
    demo: ["Demo payment (not a real charge)", "demo"], codpaid: ["Collected on delivery (demo)", "ok"] };
  var CITIES = {
    NCR: ["Caloocan","Las Piñas","Makati","Malabon","Mandaluyong","Manila","Marikina","Muntinlupa","Navotas","Parañaque","Pasay","Pasig","Pateros","Quezon City","San Juan","Taguig","Valenzuela"],
    Batangas: ["Agoncillo","Alitagtag","Balayan","Balete","Batangas City","Bauan","Calaca","Calatagan","Cuenca","Ibaan","Laurel","Lemery","Lian","Lipa","Lobo","Mabini","Malvar","Mataasnakahoy","Nasugbu","Padre Garcia","Rosario","San Jose","San Juan","San Luis","San Nicolas","San Pascual","Santa Teresita","Santo Tomas","Taal","Talisay","Tanauan","Taysan","Tingloy","Tuy"]
  };
  function $(id) { return document.getElementById(id); }
  function el(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x !== undefined) n.textContent = x; return n; }
  function peso(n) { return "\u20b1" + (Math.round(n * 100) / 100).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function jget(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function orders() { var o = jget(OK, []); return Array.isArray(o) ? o : []; }
  function shipping(sub, city) { return sub <= 0 ? 0 : (city === "Balayan" && sub >= 1500 ? 0 : 100); }
  function badge(txt, cls) { return el("span", "badge " + (cls || ""), txt); }
  function stamp(t) { return new Date(t).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }); }

  /* ---------------- CHECKOUT ---------------- */
  var form = $("coForm");
  if (form) {
    var items = (typeof cartRead === "function" ? cartRead() : []).filter(function (i) { return i && i.qty > 0; });
    if (!items.length) { $("coEmpty").hidden = false; $("coMain").hidden = true; return; }
    var FREE_MIN = 1500;                                       // free delivery within Balayan from this subtotal
    var PICKUP_NOTE = "Pick-up point in Balayan, Batangas. We'll message you the exact spot and time once your order is confirmed.";   // EDIT to your real pick-up details
    var PROMOS = { LIKHA10: { pct: 10, label: "10% off your items" } };   // SAMPLE promo code: edit or remove
    try { var qc = jget("likhaluntianQuizCoupon", null); if (qc && qc.code && qc.pct) PROMOS[String(qc.code).toUpperCase()] = { pct: qc.pct, label: qc.pct + "% off your items (quiz reward)" }; } catch (e) { /* ignore */ }   // coupon won in the homepage Did You Know? quiz
    var F = ["firstName","lastName","mobile","email","region","city","barangay","houseNumber","street","building","postalCode","instructions"];
    var ADDR = ["region","city","barangay","houseNumber","street"];
    var saved = jget(AK, {}), promo = "", mode = "deliver";
    function fld(k) { return form.elements[k]; }
    function fillCities(r, sel) {
      var c = fld("city"); c.textContent = ""; var l = CITIES[r];
      c.appendChild(new Option(l ? "Select City / Municipality" : "Select Region first", ""));
      (l || []).forEach(function (n) { c.appendChild(new Option(n, n)); });
      c.disabled = !l; if (l && l.indexOf(sel) > -1) c.value = sel;
    }
    if (saved.fullName && !saved.firstName) {                  // saved address stores one full name: split it for the two fields
      var sp = saved.fullName.trim().split(/\s+/); saved.lastName = sp.length > 1 ? sp.pop() : ""; saved.firstName = sp.join(" ");
    }
    F.forEach(function (k) { if (k !== "city" && saved[k]) fld(k).value = saved[k]; });
    fillCities(fld("region").value, saved.city);
    $("pickupNote").textContent = PICKUP_NOTE;
    var payBox = $("payOpts");
    Object.keys(PAY).forEach(function (k) {
      var p = PAY[k], lab = el("label", "co-pay" + (p.off ? " is-off" : ""));
      var r = el("input"); r.type = "radio"; r.name = "payment"; r.value = k; r.disabled = !!p.off; if (k === "gcash") r.checked = true;
      var d = el("div"); d.appendChild(el("strong", "", p.name + (p.off ? " (coming soon)" : ""))); d.appendChild(el("small", "", p.note));
      lab.appendChild(r); lab.appendChild(d); payBox.appendChild(lab);
    });
    function method() { var c = form.querySelector("input[name=payment]:checked"); return c ? c.value : ""; }
    function totals() {
      var sub = items.reduce(function (s, i) { return s + i.price * i.qty; }, 0);
      var disc = promo && PROMOS[promo] ? Math.round(sub * PROMOS[promo].pct) / 100 : 0;
      var sh = mode === "pickup" ? 0 : shipping(sub, fld("city").value);
      return { sub: sub, discount: disc, ship: sh, total: sub - disc + sh };
    }
    function paint() {
      var t = totals(), list = $("coItems"); list.textContent = "";
      items.forEach(function (i) {
        var row = el("div", "co-item"), box = el("div", "co-item-img"), im = el("img");
        im.src = i.image || "../assets/logo.png"; im.alt = "";
        im.onerror = function () { im.onerror = null; im.src = "../assets/logo.png"; };
        box.appendChild(im); box.appendChild(el("span", "co-item-qty", String(i.qty)));
        var tx = el("div"); tx.appendChild(el("p", "co-item-name", i.name));
        if (i.variant) tx.appendChild(el("p", "co-item-meta", i.variant));
        tx.appendChild(el("p", "co-item-meta", peso(i.price * i.qty)));
        row.appendChild(box); row.appendChild(tx); list.appendChild(row);
      });
      $("coSub").textContent = peso(t.sub); $("coShip").textContent = t.ship === 0 ? "Free" : peso(t.ship); $("coTotal").textContent = peso(t.total);
      $("coDiscRow").hidden = !t.discount;
      if (t.discount) { $("coDiscLabel").textContent = "Discount (" + promo + ")"; $("coDisc").textContent = "\u2212" + peso(t.discount); }
      // shipping section + free-delivery progress
      var city = fld("city").value, bar = $("freeBarWrap");
      $("shipName").textContent = mode === "pickup" ? "Pick-up in Balayan" : "Standard Delivery";
      $("shipPrice").textContent = t.ship === 0 ? "Free" : peso(t.ship);
      $("shipInfo").hidden = false;
      if (mode === "pickup") {
        $("shipInfoText").textContent = "Pick-up is free. No delivery address needed."; $("freeText").textContent = "Pick-up orders have no delivery fee."; bar.hidden = true;
      } else if (city === "Balayan") {
        var need = FREE_MIN - t.sub;
        $("shipInfoText").textContent = "Delivering within Balayan: free on orders of " + peso(FREE_MIN) + " or more.";
        $("freeText").textContent = need > 0 ? "Add " + peso(need) + " more for free delivery." : "You qualify for free shipping!";
        bar.hidden = false; $("freeBar").style.width = Math.min(100, Math.round(t.sub / FREE_MIN * 100)) + "%";
      } else {
        $("shipInfoText").textContent = city ? "Standard delivery fee applies to " + city + "." : "Select your city to see your delivery fee. Delivering within Balayan is free on orders of " + peso(FREE_MIN) + " or more.";
        $("freeText").textContent = "Free delivery applies within Balayan on orders of " + peso(FREE_MIN) + " or more."; bar.hidden = true;
      }
      var m = method(); $("demoNote").hidden = !(PAY[m] && (PAY[m].online || m === "bank"));
      $("demoNote").textContent = m === "bank"
        ? "No money moves on this site. You'll get sample bank details after placing the order, and payment stays \u201cAwaiting verification\u201d until the shop confirms it."
        : "Demo checkout: no live payment gateway is connected yet, so no real charge is made and your order will show \u201cAwaiting payment\u201d. A real gateway (e.g. PayMongo or Xendit) must be integrated server-side before accepting real " + (PAY[m] ? PAY[m].name : "") + " payments.";
    }
    function clr(k) { var p = $("e-" + k); if (p) { p.hidden = true; } if (fld(k) && fld(k).removeAttribute) fld(k).removeAttribute("aria-invalid"); }
    function setMode(m) {
      mode = m; $("addrFields").hidden = m === "pickup"; $("pickupInfo").hidden = m !== "pickup";
      ADDR.forEach(clr); paint();
    }
    form.addEventListener("input", function (e) { clr(e.target.name); });
    fld("region").addEventListener("change", function () { fillCities(this.value, ""); clr("city"); paint(); });
    fld("city").addEventListener("change", paint);
    form.querySelectorAll("input[name=payment]").forEach(function (r) { r.addEventListener("change", paint); });
    form.querySelectorAll("input[name=deliveryMode]").forEach(function (r) { r.addEventListener("change", function () { if (this.checked) setMode(this.value); }); });
    // promo code (one per order)
    var pIn = $("promoCode"), pBtn = $("promoBtn"), pMsg = $("promoMsg");
    function promoSay(txt, cls) { pMsg.textContent = txt; pMsg.className = "co-hint" + (cls ? " " + cls : ""); }
    function applyPromo() {
      if (promo) { promo = ""; pIn.value = ""; pIn.disabled = false; pBtn.textContent = "Apply"; promoSay("Limit 1 promo per order."); paint(); return; }
      var c = pIn.value.trim().toUpperCase();
      if (!c) { promoSay("Enter a promo code first.", "is-bad"); return; }
      if (!PROMOS[c]) { promoSay("That promo code isn't valid.", "is-bad"); return; }
      promo = c; pIn.value = c; pIn.disabled = true; pBtn.textContent = "Remove"; promoSay(c + " applied: " + PROMOS[c].label + ".", "is-ok"); paint();
    }
    pBtn.addEventListener("click", applyPromo);
    pIn.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); applyPromo(); } });
    function validate(a) {
      var e = {};
      if (!a.firstName) e.firstName = "Please enter your first name.";
      if (!a.lastName) e.lastName = "Please enter your last name.";
      if (!a.mobile) e.mobile = "Please enter your mobile number.";
      else if (!/^(\+?63|0)9\d{9}$/.test(a.mobile.replace(/[\s\-().]/g, ""))) e.mobile = "Enter a valid PH mobile number (e.g., 0912 345 6789).";
      if (a.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(a.email)) e.email = "Please enter a valid email address.";
      if (mode === "deliver") {
        if (!a.region) e.region = "We deliver only to NCR and Batangas."; if (!a.city) e.city = "Please select your city/municipality.";
        if (!a.barangay) e.barangay = "Please enter your barangay."; if (!a.houseNumber) e.houseNumber = "Please enter your house/unit number.";
        if (!a.street) e.street = "Please enter your street.";
        if (a.postalCode && !/^\d{4}$/.test(a.postalCode)) e.postalCode = "Postal code must be 4 digits.";
      }
      if (!method()) e.payment = "Please choose a payment method.";
      return e;
    }
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var a = {}; F.forEach(function (k) { a[k] = fld(k).value.trim(); });
      a.fullName = (a.firstName + " " + a.lastName).trim();
      var errs = validate(a), first = null;
      ["firstName","lastName","mobile","email","region","city","barangay","houseNumber","street","postalCode","payment"].forEach(function (k) {
        var p = $("e-" + k); if (!p) return;
        if (errs[k]) { p.textContent = errs[k]; p.hidden = false; if (fld(k) && fld(k).setAttribute) fld(k).setAttribute("aria-invalid", "true"); if (!first) first = fld(k) && fld(k).focus ? fld(k) : payBox; } else p.hidden = true;
      });
      if (first) { first.scrollIntoView({ block: "center" }); if (first.focus) first.focus(); return; }
      var addr = { fullName: a.fullName, mobile: a.mobile, email: a.email, instructions: a.instructions };
      if (mode === "pickup") { addr.region = "Batangas"; addr.city = "Balayan"; addr.barangay = ""; addr.houseNumber = ""; addr.street = ""; addr.building = ""; addr.postalCode = ""; }
      else { ["region","city","barangay","houseNumber","street","building","postalCode"].forEach(function (k) { addr[k] = a[k]; }); }
      var m = method(), t = totals(), now = Date.now();
      var id = "LL-" + new Date(now).toISOString().slice(2, 10).replace(/-/g, "") + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
      var order = { id: id, created: now, items: items, address: addr, delivery: mode, promo: promo, method: m, totals: t, demo: !!PAY[m].online || m === "bank",
        payStatus: m === "cod" ? "cod" : "awaiting", stage: 1, log: [{ stage: 1, at: now }] };
      var all = orders(); all.unshift(order);
      if (!jset(OK, all)) { $("coMsg").textContent = "Couldn't save your order (browser storage is blocked). Please enable storage and retry."; $("coMsg").hidden = false; return; }
      if (mode === "deliver") jset(AK, addr);                  // remember the delivery address only (not a pick-up order)
      cartSave([]); cartRender();
      location.href = "orders.html?order=" + encodeURIComponent(id) + "&new=1";
    });
    paint();
  }

  /* ---------------- ORDERS: history, detail, tracking ---------------- */
  var host = $("ordersHost");
  if (host) {
    var qs = new URLSearchParams(location.search), want = qs.get("order");
    function save(o) { var all = orders().map(function (x) { return x.id === o.id ? o : x; }); jset(OK, all); }
    function findOrder(id) { id = (id || "").trim().toUpperCase(); return orders().filter(function (o) { return o.id === id; })[0]; }
    function history() {
      host.textContent = "";
      var box = el("section", "sf-card"); box.appendChild(el("h3", "", "Track an order"));
      var f = el("form", "lookup"); var i = el("input"); i.type = "text"; i.placeholder = "Order number, e.g. LL-261019-AB12"; i.setAttribute("aria-label", "Order number");
      var b = el("button", "sf-btn", "Track"); b.type = "submit"; var msg = el("p", "err"); msg.hidden = true; msg.setAttribute("role", "alert");
      f.appendChild(i); f.appendChild(b); box.appendChild(f); box.appendChild(msg);
      f.addEventListener("submit", function (e) { e.preventDefault(); var o = findOrder(i.value);
        if (o) { location.href = "orders.html?order=" + encodeURIComponent(o.id); } else { msg.textContent = "No order with that number was found on this device."; msg.hidden = false; } });
      host.appendChild(box);
      var list = orders(); host.appendChild(el("h3", "", "Order history"));
      if (!list.length) { var e = el("div", "sf-card"); e.appendChild(el("p", "", "You haven't placed any orders yet.")); var a = el("a", "sf-btn", "Start shopping"); a.href = "categories.html"; e.appendChild(a); host.appendChild(e); return; }
      list.forEach(function (o) {
        var c = el("div", "sf-card ord"), l = el("div"); l.appendChild(el("h4", "", o.id));
        l.appendChild(el("p", "meta", stamp(o.created) + " \u00b7 " + o.items.length + " item(s) \u00b7 " + peso(o.totals.total) + " \u00b7 " + PAY[o.method].name));
        var r = el("div"); r.appendChild(badge(STAGES[o.stage], "ok")); r.appendChild(document.createTextNode(" ")); var ps = PSTAT[o.payStatus]; r.appendChild(badge(ps[0], ps[1]));
        r.appendChild(document.createTextNode(" ")); var v = el("a", "sf-btn out", "View"); v.href = "orders.html?order=" + encodeURIComponent(o.id); r.appendChild(v);
        c.appendChild(l); c.appendChild(r); host.appendChild(c);
      });
    }
    function detail(o) {
      host.textContent = "";
      if (qs.get("new")) {
        var bn = el("div", "banner"); bn.setAttribute("role", "status");
        bn.appendChild(el("h3", "", "Order placed \u2014 thank you!")); bn.appendChild(el("p", "", "Your order number is " + o.id + ". " + (o.payStatus === "cod" ? "Please prepare " + peso(o.totals.total) + " in cash for the rider." : "Your payment is NOT yet confirmed (see Payment below).") + " Save this number to track your order."));
        host.appendChild(bn);
      }
      var back = el("a", "back-link", "\u2190 All orders"); back.href = "orders.html"; host.appendChild(back);
      host.appendChild(el("h3", "", "Order " + o.id));
      var tc = el("section", "sf-card"); tc.appendChild(el("h3", "", "Order progress (fulfillment)"));
      var tr = el("ol", "tracker"); tr.setAttribute("aria-label", "Order progress");
      STAGES.forEach(function (s, n) { var li = el("li", n < o.stage ? "done" : n === o.stage ? "now" : "", s); if (n === o.stage) li.setAttribute("aria-current", "step"); tr.appendChild(li); });
      tc.appendChild(tr);
      var lg = o.log[o.log.length - 1]; tc.appendChild(el("p", "meta", "Current: " + STAGES[o.stage] + " \u00b7 updated " + stamp(lg.at)));
      if (o.stage < 6) {
        var adv = el("button", "sf-btn out", "Demo: advance to \u201c" + STAGES[o.stage + 1] + "\u201d"); adv.type = "button";
        adv.addEventListener("click", function () { o.stage++; o.log.push({ stage: o.stage, at: Date.now() });
          if (o.stage === 6 && o.payStatus === "cod") o.payStatus = "codpaid"; save(o); detail(o); });
        tc.appendChild(adv); tc.appendChild(el("p", "meta", "Demo control only: there is no courier or shop backend yet, so statuses don't update by themselves."));
      }
      host.appendChild(tc);
      var two = el("div", "two"), pc = el("section", "sf-card"); pc.appendChild(el("h3", "", "Payment"));
      var ps = PSTAT[o.payStatus]; pc.appendChild(el("p", "", "Method: " + PAY[o.method].name)); var pb = el("p"); pb.appendChild(document.createTextNode("Status: ")); pb.appendChild(badge(ps[0], ps[1])); pc.appendChild(pb);
      pc.appendChild(el("p", "meta", "Payment status is separate from order progress above."));
      if (o.method === "bank" && o.payStatus === "awaiting") {
        var bk = el("div", "bank"); bk.innerHTML = "<strong>SAMPLE details (replace with your real account):</strong><br>Bank: Sample Bank<br>Account name: LikhaLuntian<br>Account no.: 0000-0000-00<br>Reference: " + o.id;
        pc.appendChild(bk); var sent = el("button", "sf-btn", "I've sent the transfer"); sent.type = "button"; sent.style.marginTop = "10px";
        sent.addEventListener("click", function () { o.payStatus = "verifying"; save(o); detail(o); }); pc.appendChild(sent);
      }
      if (o.payStatus === "awaiting" && PAY[o.method].online) {
        pc.appendChild(el("div", "demo-note", "Demo only: no live gateway is connected. This button records a simulated payment and does not charge anyone."));
        var sim = el("button", "sf-btn", "Simulate " + PAY[o.method].name + " payment (demo)"); sim.type = "button";
        sim.addEventListener("click", function () { o.payStatus = "demo"; save(o); detail(o); }); pc.appendChild(sim);
      }
      var sc = el("section", "sf-card"); sc.appendChild(el("h3", "", o.delivery === "pickup" ? "Pick-up details" : "Delivery details")); var a = o.address;
      (o.delivery === "pickup" ? [a.fullName, a.mobile, "Pick-up: " + a.city + ", " + a.region, a.instructions && "Note: " + a.instructions] : [a.fullName, a.mobile, "House/Unit " + a.houseNumber + ", " + a.street, a.building, "Brgy. " + a.barangay, a.city + ", " + a.region + (a.postalCode ? " " + a.postalCode : ""), a.instructions && "Note: " + a.instructions]).forEach(function (t) { if (t) sc.appendChild(el("p", "", t)); });
      two.appendChild(pc); two.appendChild(sc); host.appendChild(two);
      var ic = el("section", "sf-card"); ic.appendChild(el("h3", "", "Items"));
      o.items.forEach(function (i) { var r = el("div", "sf-line"); r.appendChild(el("span", "", i.name + (i.variant ? " (" + i.variant + ")" : "") + " \u00d7 " + i.qty)); r.appendChild(el("strong", "", peso(i.price * i.qty))); ic.appendChild(r); });
      [["Subtotal", peso(o.totals.sub)]].concat(o.totals.discount ? [["Discount" + (o.promo ? " (" + o.promo + ")" : ""), "\u2212" + peso(o.totals.discount)]] : [], [["Shipping", o.totals.ship ? peso(o.totals.ship) : "Free"]]).forEach(function (x) { var r = el("div", "sf-line"); r.appendChild(el("span", "", x[0])); r.appendChild(el("span", "", x[1])); ic.appendChild(r); });
      var tt = el("div", "sf-line sf-total"); tt.appendChild(el("span", "", "Total")); tt.appendChild(el("span", "", peso(o.totals.total))); ic.appendChild(tt); host.appendChild(ic);
    }
    var cur = want && findOrder(want);
    if (want && !cur) { history(); var n = el("p", "err", "Order \u201c" + want + "\u201d wasn't found on this device."); host.insertBefore(n, host.firstChild); }
    else if (cur) detail(cur); else history();
  }
})();

/* ============================================================
   GLOBAL NAV: "My Account" link on every page
   Adds the link right after "Log-in/Sign-up" if the page's nav doesn't already have it,
   so you don't have to edit each HTML file by hand.
   ============================================================ */
(function () {
  "use strict";
  var box = document.querySelector(".global-nav .nav-links");
  if (!box || box.querySelector('a[href$="account.html"]')) return;       // no nav, or link already there
  var a = document.createElement("a");
  a.href = "account.html";
  a.textContent = "My Account";
  if (/account\.html$/.test(location.pathname)) a.setAttribute("aria-current", "page");
  var anchor = box.querySelector('a[href*="user-login"]');                 // Log-in/Sign-up
  if (anchor && anchor.parentNode === box) box.insertBefore(a, anchor.nextSibling);
  else box.insertBefore(a, box.firstChild);
})();