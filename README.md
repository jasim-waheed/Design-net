# DesignNest — Static HTML/CSS/JS Version

This is the plain HTML/CSS/JS version of the DesignNest website
(converted from the original Next.js/React project). The design,
layout, colors, fonts and all functionality are the same — only the
underlying code is now plain HTML/CSS/JS instead of Next.js.

## Structure
```
index.html          -> main website
admin/index.html     -> admin panel (password protected)
css/style.css         -> shared custom styles (fonts, gradients, scrollbar)
js/data.js            -> portfolio + social links data
js/firebase.js        -> Firebase config + helpers (same project as before)
js/emailConfig.js     -> EmailJS settings (fill in to get messages on Gmail)
js/main.js            -> main site behaviour (menu, portfolio filter, contact form)
admin/js/admin.js     -> admin panel behaviour
images/               -> all images, including the new logo.png
```

## How to open it
Just open `index.html` in a browser, or upload the whole folder to any
static web host (Netlify, Vercel static, GitHub Pages, cPanel, etc.) —
no build step, no Node.js required.

## Admin panel
Go to `admin/index.html`.
Password: `@Jasimkhan5917`

## Notes
- Firebase (cloud sync for messages/projects) uses the same project as
  before, so it works out of the box, same as the original.
- To email every contact-form message to your Gmail, fill in your
  EmailJS details in `js/emailConfig.js`.
- The logo (`images/logo.png`) was regenerated as a new design.
