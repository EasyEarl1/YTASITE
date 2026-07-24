/* Meta (Facebook) Pixel + YTA Chads funnel tracking
 * --------------------------------------------------
 * Optimising for: leads / call bookings.
 *
 * STANDARD EVENTS
 *   PageView          every page
 *   InitiateCheckout  clicked through to Calendly (intent)
 *   Lead              a call is actually BOOKED
 *
 * CUSTOM EVENTS (funnel diagnostics - see where people drop off)
 *   VSLPlay           pressed play on the video
 *   VSL25/50/75/100   watched that % of the video
 *   Scroll50/90       scrolled that far down the page
 *
 * Lead fires on a genuine completed booking, via either route:
 *   1. the Calendly popup posts "calendly.event_scheduled"
 *   2. Calendly redirects to /yta-call-thank-you
 * It is deduped per SESSION, so one booking is never counted twice.
 * Diagnostic events are deduped per PAGE LOAD.
 */
(function () {
  var PIXEL_ID = '2258815231190030';

  /* --- Meta Pixel base code --- */
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
  (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');

  fbq('init', PIXEL_ID);
  fbq('track', 'PageView');

  /* --- helpers --------------------------------------------------- */

  // diagnostic events: only once per page load
  var seen = {};
  function once(name) {
    if (seen[name]) return;
    seen[name] = 1;
    fbq('trackCustom', name);
  }

  /* Claim a conversion once per time window, ACROSS TABS.
   * localStorage (not sessionStorage) because the journey spans tabs:
   * the form is submitted on this page, then Calendly may open in a new
   * tab and redirect to /congrats - a fresh sessionStorage would let the
   * same person be counted twice.
   * If storage is blocked entirely we fire rather than lose the conversion:
   * under-counting is worse than a rare duplicate. */
  var DEDUPE_MS = 6 * 60 * 60 * 1000; // 6 hours = one funnel journey
  function claim(key) {
    var now = Date.now();
    try {
      var prev = parseInt(localStorage.getItem(key) || '0', 10);
      if (prev && (now - prev) < DEDUPE_MS) return false;
      localStorage.setItem(key, String(now));
      return true;
    } catch (err) { /* fall through to sessionStorage */ }
    try {
      if (sessionStorage.getItem(key)) return false;
      sessionStorage.setItem(key, String(now));
      return true;
    } catch (err) { /* storage unavailable */ }
    return true;
  }

  function trackLead() {
    if (!claim('yta_lead_fired')) return;
    fbq('track', 'Lead');
  }
  window.ytaTrackLead = trackLead;

  /* A confirmed booking fires BOTH:
   *   Lead     - what the ad campaign currently optimises toward
   *   Schedule - the booking itself, kept separate so that if Lead ever
   *              moves to an earlier step (e.g. an application form), the
   *              true booking count stays intact and comparable.
   * Each is deduped independently, per session. */
  function trackBooking() {
    // On /free-training the application form already claimed the Lead, so
    // this is a no-op there. On the older Calendly-link pages the booking
    // IS the lead, so it still fires. Either way: at most one Lead.
    trackLead();
    if (!claim('yta_booking_fired')) return;
    fbq('track', 'Schedule');
  }
  window.ytaTrackBooking = trackBooking;

  /* --- Booking completed ----------------------------------------- */

  /* 1. inside the Calendly popup/embed */
  window.addEventListener('message', function (e) {
    if (!e.origin || e.origin.indexOf('calendly.com') === -1) return;
    if (e.data && e.data.event === 'calendly.event_scheduled') trackBooking();
  });

  /* 2. a booking confirmation page (Calendly redirect target) */
  if (/yta-call-thank-you|congrats/i.test(window.location.pathname)) trackBooking();

  /* --- InitiateCheckout: clicked through to Calendly --------------
   * Covers BOTH patterns used across the site:
   *   - plain links  <a href="https://calendly.com/...">
   *   - popup buttons <button class="js-book"> (used on /free-training)
   */
  document.addEventListener('click', function (e) {
    var el = e.target;
    if (!el || !el.closest) return;
    if (el.closest('a[href*="calendly.com"]') || el.closest('.js-book')) {
      once('CTAClick');
      fbq('track', 'InitiateCheckout');
    }
    // scroll-to-application CTAs on /free-training
    if (el.closest('.js-apply')) once('ApplyClick');
  }, true);

  /* --- Typeform application form ---------------------------------
   * The form sits under the VSL and ends with the booking link, so a
   * completed form is the lead. Typeform posts messages to the parent
   * window; accept the known submit signals defensively since the exact
   * payload key has varied across embed versions.
   */
  window.addEventListener('message', function (e) {
    if (!e.origin || e.origin.indexOf('typeform.com') === -1) return;
    var d = e.data;
    if (!d) return;
    var type = (typeof d === 'string') ? d : (d.type || d.event || '');
    if (typeof type !== 'string') return;
    // observed live: "form-ready", "form-started", "form-screen-changed"
    if (/form-?ready/i.test(type))   once('FormView');
    if (/form-?started/i.test(type)) once('FormStart');
    // matches form-submit and form-submitted
    if (/form-?submit|submit-?form|form_submit/i.test(type)) {
      once('FormSubmit');
      trackLead();
    }
  });

  /* --- VSL engagement (Wistia) -----------------------------------
   * The single most useful signal on a VSL page: did they press play,
   * and where did they quit? Binds to every Wistia video on the page.
   */
  function markPercent(pct) {
    if (pct >= 25) once('VSL25');
    if (pct >= 50) once('VSL50');
    if (pct >= 75) once('VSL75');
    if (pct >= 95) once('VSL100');
  }

  /* (a) modern <wistia-player> web component - used on /free-training.
   * It emits standard DOM events: "play" and "timechange" (NOT the legacy
   * percentwatchedchanged), so quartiles are derived from currentTime. */
  function bindPlayerElement(el) {
    if (!el || el.__ytaBound) return;
    el.__ytaBound = true;
    el.addEventListener('play', function () { once('VSLPlay'); });
    el.addEventListener('timechange', function () {
      var d = el.duration, t = el.currentTime;
      if (!d || !isFinite(d) || d <= 0) return;
      markPercent((t / d) * 100);
    });
  }
  function bindAllPlayers() {
    var els = document.querySelectorAll('wistia-player');
    for (var i = 0; i < els.length; i++) bindPlayerElement(els[i]);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindAllPlayers);
  } else {
    bindAllPlayers();
  }
  // catch players injected after load
  if (window.MutationObserver) {
    new MutationObserver(bindAllPlayers).observe(document.documentElement, {
      childList: true, subtree: true
    });
  }

  /* (b) legacy Wistia embeds on the older pages */
  window._wq = window._wq || [];
  window._wq.push({
    id: '_all',
    onReady: function (video) {
      video.bind('play', function () { once('VSLPlay'); });
      video.bind('percentwatchedchanged', function (percent) {
        markPercent(percent * 100);
      });
    }
  });

  /* --- Scroll depth ---------------------------------------------
   * Distinguishes "bounced at the hero" from "read everything and
   * still didn't book" - two very different problems.
   */
  function checkScroll() {
    var doc = document.documentElement;
    var height = Math.max(doc.scrollHeight, document.body.scrollHeight) - window.innerHeight;
    if (height <= 0) return;
    var pct = ((window.pageYOffset || doc.scrollTop) / height) * 100;
    if (pct >= 50) once('Scroll50');
    if (pct >= 90) once('Scroll90');
  }
  // time-throttled rather than rAF: rAF is paused in background/non-visible
  // tabs, which would silently drop scroll data
  var lastRun = 0;
  window.addEventListener('scroll', function () {
    var now = Date.now();
    if (now - lastRun < 200) return;
    lastRun = now;
    checkScroll();
  }, { passive: true });
  checkScroll(); // short pages / restored scroll position
  window.ytaCheckScroll = checkScroll;
})();
