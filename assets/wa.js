/* Floating WhatsApp button: opens a chat with Nandi Go, with a ready message that names the page or trip. */
(function () {
  if (document.querySelector('.wa-fab')) return;
  var num = (window.NG && NG.CONTACT && NG.CONTACT.WHATSAPP) || '919513646646';
  function msg() {
    var p = location.pathname;
    var title = (document.querySelector('h1') || {}).textContent || '';
    if (/trip/.test(p) && title) return 'Hi Nandi Go, I am interested in the ' + title.trim() + ' trip. Please share details.';
    if (/partners/.test(p)) return 'Hi Nandi Go, I would like to know more about becoming a Nandi Go partner.';
    if (/my-trips/.test(p)) return 'Hi Nandi Go, I have a question about my booking.';
    return 'Hi Nandi Go, I would like to know more about your trips.';
  }
  var a = document.createElement('a');
  a.className = 'wa-fab'; a.target = '_blank'; a.rel = 'noopener';
  a.setAttribute('aria-label', 'Chat with Nandi Go on WhatsApp');
  a.innerHTML = '<span class="wa-fab-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.2A9.8 9.8 0 0 0 3.6 17l-1.3 4.8 4.9-1.3A9.8 9.8 0 1 0 12 2.2zm0 17.8a8 8 0 0 1-4.1-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 1 1 12 20zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1l-.5-.3z"/></svg></span><span class="wa-fab-t">WhatsApp us</span>';
  a.addEventListener('click', function () { a.href = 'https://wa.me/' + num + '?text=' + encodeURIComponent(msg()); });
  a.href = 'https://wa.me/' + num + '?text=' + encodeURIComponent(msg());
  document.body.appendChild(a);
})();
