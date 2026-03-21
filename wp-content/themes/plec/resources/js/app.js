window.addEventListener('DOMContentLoaded', function () {
    var nav = document.getElementById('primary-navigation')
    var toggle = document.getElementById('primary-menu-toggle')
    var hamburgerIcon = toggle ? toggle.querySelector('.hamburger-icon') : null
    var closeIcon = toggle ? toggle.querySelector('.close-icon') : null

    // Create mobile overlay
    var overlay = document.createElement('div')
    overlay.className = 'mobile-menu-overlay'
    document.body.appendChild(overlay)

    var isOpen = false

    function openMenu() {
        isOpen = true
        nav.classList.add('is-open')
        overlay.style.display = 'block'
        // Force reflow for transition
        overlay.offsetHeight
        overlay.classList.add('is-active')
        if (hamburgerIcon) hamburgerIcon.style.display = 'none'
        if (closeIcon) closeIcon.style.display = 'block'
        document.body.style.overflow = 'hidden'
    }

    function closeMenu() {
        isOpen = false
        nav.classList.remove('is-open')
        overlay.classList.remove('is-active')
        if (hamburgerIcon) hamburgerIcon.style.display = 'block'
        if (closeIcon) closeIcon.style.display = 'none'
        document.body.style.overflow = ''
        setTimeout(function () {
            if (!isOpen) overlay.style.display = 'none'
        }, 300)
    }

    if (nav && toggle) {
        toggle.addEventListener('click', function (e) {
            e.preventDefault()
            if (isOpen) {
                closeMenu()
            } else {
                openMenu()
            }
        })

        overlay.addEventListener('click', closeMenu)

        // Close on Escape key
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && isOpen) closeMenu()
        })
    }

    // Dark / Light mode toggle - inject into nav
    if (nav) {
        var saved = null
        try { saved = localStorage.getItem('plec-theme') } catch(e) {}
        var isDark = saved === 'dark'

        function applyTheme(dark) {
            var targets = [document.documentElement, document.body]
            targets.forEach(function(el) {
                if (dark) { el.classList.add('plec-dark') } else { el.classList.remove('plec-dark') }
            })
            document.body.style.background = dark ? 'var(--plec-bg, #2b2b2b)' : ''
            document.body.style.transition = 'background 0.3s'
            try { localStorage.setItem('plec-theme', dark ? 'dark' : 'light') } catch(e) {}
            var plecRoot = document.getElementById('plec-root')
            if (plecRoot) {
                if (dark) { plecRoot.classList.add('plec-dark') } else { plecRoot.classList.remove('plec-dark') }
            }
        }

        applyTheme(isDark)

        var toggleBtn = document.createElement('button')
        toggleBtn.type = 'button'
        toggleBtn.title = isDark ? 'Switch to light mode' : 'Switch to dark mode'
        toggleBtn.id = 'plec-theme-toggle'
        Object.assign(toggleBtn.style, {
            width: '36px', height: '36px', borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.8)',
            cursor: 'pointer', transition: 'all 0.25s',
            backdropFilter: 'blur(8px)', marginLeft: '8px'
        })

        var sunIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>'
        var moonIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>'

        function updateToggle() {
            toggleBtn.innerHTML = isDark ? sunIcon : moonIcon
            toggleBtn.title = isDark ? 'Switch to light mode' : 'Switch to dark mode'
        }
        updateToggle()

        toggleBtn.addEventListener('click', function() {
            isDark = !isDark
            applyTheme(isDark)
            updateToggle()
            window.dispatchEvent(new CustomEvent('plec-theme-change', { detail: { isDark: isDark } }))
        })

        toggleBtn.addEventListener('mouseenter', function() {
            toggleBtn.style.background = 'rgba(255,255,255,0.2)'
            toggleBtn.style.color = '#fff'
            toggleBtn.style.borderColor = 'rgba(255,255,255,0.35)'
        })
        toggleBtn.addEventListener('mouseleave', function() {
            toggleBtn.style.background = 'rgba(255,255,255,0.1)'
            toggleBtn.style.color = 'rgba(255,255,255,0.8)'
            toggleBtn.style.borderColor = 'rgba(255,255,255,0.2)'
        })

        nav.appendChild(toggleBtn)
    }
})
