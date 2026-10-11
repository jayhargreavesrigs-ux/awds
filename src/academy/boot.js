// Keep the hosted portal closed until its account service is configured.
(async function () {
  const config = window.AWDS_CONFIG || {};
  const main = document.querySelector('#main');

  function unavailable(message) {
    document.querySelector('.shell').style.gridTemplateColumns = '1fr';
    document.querySelector('#map').hidden = true;
    for (const element of document.querySelectorAll('#menuBtn, #voiceBtn, #dashBtn, .meter')) {
      element.hidden = true;
      element.style.display = 'none';
    }
    main.innerHTML = '<div class="home"><div class="crumb">Axis Well Delivery Systems · Training</div><h1>AWDS Academy</h1><p class="intro" role="status"></p><p><a class="btn primary" href="mailto:info@axiswelldelivery.com">Contact the training team</a></p></div>';
    main.querySelector('[role="status"]').textContent = message;
  }

  if (config.backend !== 'supabase' || !config.supabaseUrl || !config.supabaseAnonKey) {
    unavailable('Trainee sign-in is being set up. Please contact the training team for access.');
    return;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Could not load ' + src));
      document.head.appendChild(script);
    });
  }

  try {
    // Verify that the Academy schema is installed before offering account creation.
    const healthUrl = new URL('/rest/v1/rpc/awds_check_code', config.supabaseUrl);
    healthUrl.searchParams.set('p_email', 'connection-probe@example.invalid');
    healthUrl.searchParams.set('p_code', 'INVALID-PROBE');
    const response = await fetch(healthUrl, {
      headers: { apikey: config.supabaseAnonKey },
      signal: AbortSignal.timeout(10000), redirect: 'error'
    });
    if (response.status === 404) {
      unavailable('The Academy database is being prepared. Trainee sign-in will open once setup is complete.');
      return;
    }
    if (!response.ok || await response.json() !== false) throw new Error('Academy connection check failed.');
    await loadScript('vendor/supabase.js');
    await loadScript('awds-backend.js');
    if (!window.claude?.use) throw new Error('Account service could not start.');
    await loadScript('academy.js');
  } catch (error) {
    console.error('AWDS Academy could not start:', error);
    unavailable('The training portal could not load. Please reload the page or contact the training team.');
  }
})();
