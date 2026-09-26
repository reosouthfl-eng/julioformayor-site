(() => {
  const nav = document.querySelector('nav');
  const links = nav?.querySelector('.nav-links');
  if (nav && links && !nav.querySelector('.mobile-nav-toggle')) {
    const toggle = document.createElement('button');
    toggle.className = 'mobile-nav-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-label', 'Open navigation menu');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = '&#9776;';
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
      toggle.innerHTML = open ? '&times;' : '&#9776;';
    });
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      links.classList.remove('is-open');
      toggle.setAttribute('aria-expanded','false');
      toggle.setAttribute('aria-label','Open navigation menu');
      toggle.innerHTML='&#9776;';
    }));
    nav.appendChild(toggle);
  }

  if (document.body && !document.querySelector('.skip-link')) {
    const skip = document.createElement('a');
    skip.className = 'skip-link';
    skip.href = '#main-content';
    skip.textContent = 'Skip to main content';
    document.body.prepend(skip);
    const main = document.querySelector('main') || document.querySelector('section, .hero, .page-hero');
    if (main && !document.getElementById('main-content')) main.id = 'main-content';
  }

  document.querySelectorAll('a[target="_blank"]').forEach(a => {
    const rel = new Set((a.getAttribute('rel') || '').split(/\s+/).filter(Boolean));
    rel.add('noopener'); rel.add('noreferrer');
    a.setAttribute('rel', [...rel].join(' '));
  });

  function status(form, text) {
    let box=form.querySelector('.form-status');
    if(!box){ box=document.createElement('div'); box.className='form-status'; box.setAttribute('role','status'); form.appendChild(box); }
    box.textContent=text;
  }
  function mailto(subject, body) {
    window.location.href = 'mailto:info@julioformayor.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }

  document.addEventListener('submit', (e) => {
    const form=e.target;
    if (!(form instanceof HTMLFormElement)) return;

    if (form.id === 'contact-form') {
      e.preventDefault(); e.stopImmediatePropagation();
      const d=new FormData(form);
      status(form,'Your email application will open with this message pre-filled. Please send the email to complete your request.');
      mailto('Website contact from ' + (d.get('name')||'visitor'),
        'Name: '+(d.get('name')||'')+'\nEmail: '+(d.get('email')||'')+'\nPhone: '+(d.get('phone')||'')+'\n\nMessage:\n'+(d.get('message')||''));
      return;
    }
    if (form.id === 'vol-form') {
      e.preventDefault(); e.stopImmediatePropagation();
      const d=new FormData(form);
      status(form,'Your email application will open with your volunteer information pre-filled. Please send the email to complete your signup.');
      mailto('Volunteer signup: ' + [d.get('first'),d.get('last')].filter(Boolean).join(' '),
        'Name: '+[d.get('first'),d.get('last')].filter(Boolean).join(' ')+'\nEmail: '+(d.get('email')||'')+'\nPhone: '+(d.get('phone')||'')+'\nZIP: '+(d.get('zip')||'')+'\nInterest: '+(d.get('interest')||'General volunteering'));
      return;
    }
    if (form.classList.contains('email-form')) {
      e.preventDefault(); e.stopImmediatePropagation();
      const d=new FormData(form);
      const email=d.get('email') || form.querySelector('input[type="email"]')?.value || '';
      status(form,'Your email application will open so you can request campaign updates. Please send the email to complete the request.');
      mailto('Campaign email updates request','Please add this email address to campaign updates: '+email);
    }
  }, true);
})();