import { readFileSync, writeFileSync, mkdirSync, cpSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// GitHub project sites use /awds; custom domains and local previews use /.
const basePath = (process.env.SITE_BASE_PATH || '').replace(/\/+$/, '');
if (basePath && (!/^(?:\/[A-Za-z0-9._-]+)+$/.test(basePath) || basePath.split('/').some(part => part === '.' || part === '..'))) {
  throw new Error('SITE_BASE_PATH must be a URL path such as /awds, or empty for a root domain.');
}
const read = path => readFileSync(resolve(root, path), 'utf8');
const write = (path, content) => {
  const target = resolve(root, 'dist', path);
  mkdirSync(dirname(target), { recursive: true });
  if (basePath && path.endsWith('.html')) {
    content = content.replace(/\b(href|src|action)="\/(?!\/)/g, (_, attribute) => `${attribute}="${basePath}/`);
  }
  writeFileSync(target, content);
};
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const details = JSON.parse(read('src/details.json'));
const routes = {
  drilling: ['services/drilling-engineering', 'Drilling engineering', 'drilling', 'WELL DESIGN & CONSTRUCTION'],
  completions: ['services/completions-sand-control', 'Completions & sand control', 'completions', 'RESERVOIR ACCESS & WELL INTEGRITY'],
  intervention: ['services/well-intervention', 'Well intervention', 'intervention', 'RESTORE PRODUCTIVITY. EXTEND ASSET LIFE.'],
  integrated: ['services/integrated-well-delivery', 'Integrated well delivery', 'hero', 'SINGLE-POINT ACCOUNTABILITY'],
  production: ['services/production-optimization', 'Production optimization', 'offshore', 'FULL LIFECYCLE PERFORMANCE'],
  integrity: ['services/well-integrity-qaqc', 'Well integrity & QA/QC', 'tubulars', 'RISK-BASED LIFECYCLE ASSURANCE'],
  technology: ['services/technology-commercial-approach', 'Technology & commercial approach', 'hero', 'ENGINEERING & COMMERCIAL DISCIPLINE'],
  swamp: ['experience/swamp-well-delivery', 'Swamp well delivery', 'swamp', 'WELL CONSTRUCTION TO PRODUCTION'],
  land: ['experience/dual-string-completion', 'Dual-string completion', 'land', 'LEGACY ASSET DEVELOPMENT'],
  fdp: ['experience/field-development-planning', 'Field development planning', null, 'NIGERIA & REPUBLIC OF CONGO'],
  rigs: ['experience/rig-inspections', 'Rig inspections & selection', 'tubulars', 'NIGERIA & THE UNITED STATES'],
  offshore: ['experience/offshore-well-engineering', 'Offshore well engineering', 'offshore', 'COMPLEX MULTI-ZONE WELL DESIGN'],
};
const mainLinks = [
  ['/', 'Home'], ['/about/', 'About us'], ['/services/', 'Our expertise'],
  ['/experience/', 'Our experience'], ['/hse-quality/', 'HSE & quality'], ['/contact/', 'Contact us'],
];
const anchorRoutes = { home: '/', about: '/about/', services: '/services/', projects: '/experience/', commitment: '/hse-quality/', leadership: '/about/#leadership', contact: '/contact/', approach: '/services/#approach' };
function links(html) {
  return html
    .replace(/<button\b([^>]*?)data-detail="([^"]+)"([^>]*)>([\s\S]*?)<\/button>/g, (_, before, key, after, content) => {
      if (!routes[key]) throw new Error(`Missing detail route: ${key}`);
      return `<a${before}href="/${routes[key][0]}/"${after}>${content}</a>`;
    })
    .replace(/href="#([^"]+)"/g, (whole, id) => anchorRoutes[id] ? `href="${anchorRoutes[id]}"` : whole)
    .replace(/(href|src)="assets\//g, '$1="/assets/');
}
const section = id => links(read(`src/sections/${id}.html`));
const css = read('src/styles.css');
const script = read('src/app.js');
const revision = createHash('sha256').update(css + script).digest('hex').slice(0, 10);
const baseHead = read('src/head.html')
  .replace(/<title>.*?<\/title>/, '{{TITLE}}')
  .replace(/<meta name="description"[^>]*>/, '{{DESCRIPTION}}')
  .replace(/<link rel="preload"[^>]*>/, '{{PRELOAD}}')
  .replace('href="styles.css"', `href="/styles.css?v=${revision}"`)
  .replace('src="app.js"', `src="/app.js?v=${revision}"`);
function header(active) {
  return `<a class="skip-link" href="#main">Skip to content</a>
  <div class="utility-bar"><div class="container"><span>INDIGENOUS EXPERTISE. INTERNATIONAL STANDARDS.</span><a href="mailto:info@axiswelldelivery.com">info@axiswelldelivery.com <span aria-hidden="true">↗</span></a></div></div>
  <header class="site-header"><div class="container nav-wrap">
  <a class="brand" href="/" aria-label="Axis Well Delivery home"><img src="/assets/axis-logo.png" alt="Axis Well Delivery Systems" width="220" height="84"></a>
  <button class="menu-toggle" type="button" aria-label="Open navigation" aria-expanded="false" aria-controls="navigation"><span></span><span></span></button>
  <nav id="navigation" aria-label="Main navigation">${mainLinks.map(([url, name]) => `<a href="${url}"${url === active ? ' aria-current="page"' : ''}${url === '/contact/' ? ' class="button button-orange nav-cta"' : ''}>${name}${url === '/contact/' ? ' <span aria-hidden="true">↗</span>' : ''}</a>`).join('')}</nav>
  </div></header>`;
}
const footer = links(read('src/footer.html')).replace('href="/">Back to top', 'href="#top">Back to top');
function breadcrumb(label, parent = null) {
  return `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span>${parent ? `<a href="${parent[0]}">${escape(parent[1])}</a><span aria-hidden="true">/</span>` : ''}<span aria-current="page">${escape(label)}</span></nav>`;
}
function hero({ label, title, description = '', image = 'hero', parent = null, kicker = '' }) {
  return `<section class="page-hero${image ? '' : ' page-hero-plain'}">${image ? `<img class="page-hero-image" src="/assets/${image}.webp" alt="" width="1200" height="900" fetchpriority="high">` : ''}<div class="container page-hero-content">${breadcrumb(label, parent)}${kicker ? `<p class="eyebrow light"><span></span>${escape(kicker)}</p>` : ''}<h1>${title}</h1>${description ? `<p class="page-intro">${description}</p>` : ''}</div></section>`;
}
function cta() {
  return `<section class="cta-band"><div class="container"><div><p class="eyebrow light"><span></span> LET’S TALK ABOUT YOUR PROJECT</p><h2>YOUR NEXT WELL.<br>OUR SHARED AMBITION.</h2></div><a class="button button-orange" href="/contact/">Talk to our team <span aria-hidden="true">↗</span></a></div></section>`;
}
function animateHeadings(html) {
  return html.replace(/(<h1\b[^>]*>)([\s\S]*?)(<\/h1>)/g, (_, open, title, close) => {
    const lines = title.split(/<br\s*\/?\s*>/i).map((line, index) => `<span class="title-line" style="--line-index:${index}"><span>${line}</span></span>`);
    return open + lines.join('\n') + close;
  });
}
let pageCount = 0;
function page(path, { title, description, active, content, image = null }) {
  const head = baseHead.replace('{{TITLE}}', `<title>${escape(title)} | Axis Well Delivery</title>`)
    .replace('{{DESCRIPTION}}', `<meta name="description" content="${escape(description)}">`)
    .replace('{{PRELOAD}}', image ? `<link rel="preload" as="image" href="/assets/${image}.webp">` : '');
  write(path ? `${path}/index.html` : 'index.html', `<!doctype html>\n<html lang="en">\n<head>\n${head}</head>\n<body id="top">\n${header(active)}\n<main id="main">\n${animateHeadings(content)}\n</main>\n${footer}\n</body>\n</html>\n`);
  pageCount++;
}

let homeAbout = section('about').replace('<!-- ABOUT_LINK -->', '<a class="text-link" href="/about/">Get to know Axis <span aria-hidden="true">↗</span></a>');
let homeServices = section('services').replace(/<div class="additional-services">[\s\S]*?<\/div>/, '<div class="section-action"><a class="text-link" href="/services/">View all our services <span aria-hidden="true">↗</span></a></div>');
const homeExperience = `<section class="home-experience section"><div class="container"><div><p class="eyebrow"><span></span> EXPERIENCE THAT DELIVERS</p><h2>ON LAND. IN THE SWAMP.<br>ACROSS THE WATER.</h2><p>Explore the engineering and delivery experience behind our work — from legacy well re-entry to complex offshore development.</p><a class="text-link" href="/experience/">Explore our experience <span aria-hidden="true">↗</span></a></div><img src="/assets/offshore.webp" alt="An elevated view of the working deck of an offshore rig" width="1200" height="900" loading="lazy"></div></section>`;
page('', { title: 'Engineered Right. Creating Value.', description: 'Integrated well delivery, drilling engineering, completions and intervention. Nigerian expertise and global standards, from concept to production.', active: '/', image: 'hero', content: section('home').replace('href="/about/" aria-label="Scroll to discover Axis"', 'href="#about" aria-label="Scroll to discover Axis"') + section('stats') + homeAbout + homeServices + homeExperience + cta() });
page('about', { title: 'About us & leadership', description: 'Meet Axis Well Delivery Systems and its leadership, combining commercial strategy, executive leadership and technical well-delivery expertise.', active: '/about/', image: 'team', content: hero({ label: 'About us', title: 'LOCAL ROOTS.<br>GLOBAL AMBITION.', description: 'An indigenous Nigerian company with the expertise, relationships and resolve to turn subsurface potential into producing assets.', image: 'team', kicker: 'THIS IS AXIS' }) + section('about') + section('leadership').replace('<details>', '<details open>') + section('partners') + cta() });
page('services', { title: 'Our expertise & services', description: 'Explore integrated well delivery, drilling engineering, completions, intervention, production optimization and well integrity services from Axis.', active: '/services/', image: 'completions', content: hero({ label: 'Our expertise', title: 'EXPERTISE THAT<br>GOES DEEPER.', description: 'Connected engineering and field execution, across every phase of the well lifecycle.', image: 'completions', kicker: 'OUR SERVICES' }) + section('services') + section('approach') + cta() });
page('experience', { title: 'Our experience & case studies', description: 'Explore Axis case studies in swamp well delivery, land completions, field development planning, rig inspections and offshore well engineering.', active: '/experience/', image: 'hero', content: hero({ label: 'Our experience', title: 'EXPERIENCE.<br>PUT INTO ACTION.', description: 'Well engineering and execution across land, swamp and offshore environments in Nigeria and beyond.', image: 'hero', kicker: 'SELECTED PROJECT EXPERIENCE' }) + section('projects') + cta() });
page('hse-quality', { title: 'HSE, quality & well integrity', description: 'Axis’s Goal Zero commitment: protecting people, the environment and assets through risk assessment, quality assurance and well integrity.', active: '/hse-quality/', image: 'offshore', content: hero({ label: 'HSE & quality', title: 'SAFETY FIRST.<br>QUALITY ALWAYS.', description: 'Protecting people, the environment and your assets through every phase of delivery.', image: 'offshore', kicker: 'OUR COMMITMENT' }) + section('commitment') + cta() });
const contact = section('contact').replace('<div class="contact-heading">', `<div class="contact-heading">${breadcrumb('Contact us')}`).replace('<h2>YOUR ASSET.', '<h1>YOUR ASSET.').replace('GREATER POSSIBILITIES.</span></h2>', 'GREATER POSSIBILITIES.</span></h1>');
page('contact', { title: 'Contact us', description: 'Contact Axis Well Delivery at info@axiswelldelivery.com. Discuss your project with our Port Harcourt operational office and Lagos engineering studio.', active: '/contact/', content: contact });

for (const [key, [path, name, image, kicker]] of Object.entries(routes)) {
  const data = details[key];
  const isService = path.startsWith('services/');
  const parent = isService ? ['/services/', 'Our expertise'] : ['/experience/', 'Our experience'];
  const siblingLinks = Object.entries(routes).filter(([, route]) => route[0].startsWith(isService ? 'services/' : 'experience/')).map(([siblingKey, [siblingPath, siblingName]]) => `<a href="/${siblingPath}/"${siblingKey === key ? ' aria-current="page"' : ''}>${escape(siblingName)}<span aria-hidden="true">↗</span></a>`).join('');
  const detailBody = data.body.replaceAll('<h3>', '<h2>').replaceAll('</h3>', '</h2>');
  const article = `<section class="section detail-section"><div class="container detail-layout"><article class="detail-article"><p class="eyebrow"><span></span>${escape(data.kicker)}</p><h2 class="article-title">${escape(data.title)}</h2>${detailBody}<a class="text-link" href="${parent[0]}">← Back to ${parent[1].toLowerCase()}</a></article><aside class="detail-sidebar"><h2>${isService ? 'OUR EXPERTISE' : 'MORE EXPERIENCE'}</h2><nav aria-label="${isService ? 'Services' : 'Case studies'}">${siblingLinks}</nav><div class="sidebar-contact"><h3>LET’S TALK.</h3><p>Discuss your technical or commercial requirements with our team.</p><a href="/contact/" class="button button-orange">Contact Axis <span aria-hidden="true">↗</span></a><a class="sidebar-email" href="mailto:info@axiswelldelivery.com">info@axiswelldelivery.com</a></div></aside></div></section>`;
  page(path, { title: name, description: data.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 155), active: parent[0], image, content: hero({ label: name, title: escape(name).toUpperCase(), image, parent, kicker }) + article + cta() });
}

// A real 404 document prevents a static host from treating unknown paths as a single-page app.
const notFound = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found | Axis Well Delivery</title><link rel="stylesheet" href="/styles.css?v=${revision}"></head><body id="top">${header('')}<main id="main">${hero({ label: 'Page not found', title: 'PAGE NOT FOUND.', description: 'The page may have moved. Explore our services or return to the homepage.', image: null })}<div class="container section"><a class="button button-orange" href="/">Return to home <span aria-hidden="true">↗</span></a></div></main>${footer}<script src="/app.js?v=${revision}" defer></script></body></html>`;
write('404.html', notFound);
write('styles.css', css);
write('app.js', script);
cpSync(resolve(root, 'public/assets'), resolve(root, 'dist/assets'), { recursive: true });
console.log(`Generated ${pageCount} standalone HTML pages and a 404 page.`);
