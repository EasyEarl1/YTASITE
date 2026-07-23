/* Meta (Facebook) Pixel + YTA Chads conversion tracking
 * ------------------------------------------------------
 * Optimising for: leads / call bookings.
 *
 *   PageView          every page
 *   Lead              a call is actually BOOKED (see below)
 *   InitiateCheckout  someone clicks through to Calendly (intent only)
 *
 * A booking can complete two different ways, so Lead listens for both:
 *   1. the Calendly popup on /free-training posts "calendly.event_scheduled"
 *   2. Calendly redirects to /yta-call-thank-you ("your call is booked")
 * trackLead() is deduped per session so a booking that does BOTH is
 * still only ever counted once.
 */
(function () {
  var PIXEL_ID = '2447053362468233';

  /* --- Meta Pixel base code --- */
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
  (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');

  fbq('init', PIXEL_ID);
  fbq('track', 'PageView');

  /* --- Lead: at most once per session --- */
  function trackLead() {
    try {
      if (sessionStorage.getItem('yta_lead_fired')) return;
      sessionStorage.setItem('yta_lead_fired', '1');
    } catch (err) { /* private mode / storage blocked - still fire once below */ }
    fbq('track', 'Lead');
  }
  window.ytaTrackLead = trackLead;

  /* 1. Booking completed inside the Calendly popup/embed */
  window.addEventListener('message', function (e) {
    if (!e.origin || e.origin.indexOf('calendly.com') === -1) return;
    if (e.data && e.data.event === 'calendly.event_scheduled') trackLead();
  });

  /* 2. Booking confirmation page (Calendly redirect target) */
  if (/yta-call-thank-you/i.test(window.location.pathname)) trackLead();

  /* Intent only - deliberately NOT a Lead */
  document.addEventListener('click', function (e) {
    var el = e.target;
    if (!el || !el.closest) return;
    if (el.closest('a[href*="calendly.com"]')) fbq('track', 'InitiateCheckout');
  }, true);
})();
