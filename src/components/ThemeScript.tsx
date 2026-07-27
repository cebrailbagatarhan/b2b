/** Inline bootstrap so first paint matches saved theme / locale (no flash). */
export default function ThemeScript() {
  const code = `(function(){try{var t=localStorage.getItem('toptan-ui-theme');var p=localStorage.getItem('toptan-ui-preferences');if(!t&&p){var j=JSON.parse(p);if(j&&j.state&&j.state.theme)t=j.state.theme}if(t!=='dark'&&t!=='light')t='light';document.documentElement.setAttribute('data-theme',t);document.documentElement.style.colorScheme=t;var l=localStorage.getItem('toptan-ui-locale');if(!l&&p){var j2=JSON.parse(p);if(j2&&j2.state&&j2.state.locale)l=j2.state.locale}if(l==='en'||l==='tr')document.documentElement.lang=l}catch(e){}})();`

  return (
    <script
      dangerouslySetInnerHTML={{ __html: code }}
      suppressHydrationWarning
    />
  )
}
