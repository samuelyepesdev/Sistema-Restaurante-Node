document.addEventListener('DOMContentLoaded', () => {
    // Mobile menu toggle
    const toggleBtn = document.getElementById('mobile-menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (toggleBtn && mobileMenu) {
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = mobileMenu.classList.contains('hidden');
            if (isHidden) {
                mobileMenu.classList.remove('hidden');
                // Allow browser to render display: flex before transitioning opacity/transform
                requestAnimationFrame(() => {
                    mobileMenu.classList.remove('-translate-y-4', 'opacity-0');
                    mobileMenu.classList.add('translate-y-0', 'opacity-100');
                });
                toggleBtn.querySelector('span').textContent = 'close';
            } else {
                mobileMenu.classList.remove('translate-y-0', 'opacity-100');
                mobileMenu.classList.add('-translate-y-4', 'opacity-0');
                toggleBtn.querySelector('span').textContent = 'menu';
                // Wait for animation to finish before adding hidden class
                setTimeout(() => {
                    if (mobileMenu.classList.contains('opacity-0')) {
                        mobileMenu.classList.add('hidden');
                    }
                }, 300);
            }
        });

        // Close menu on resize or click outside
        window.addEventListener('resize', () => {
            if (window.innerWidth >= 768) {
                mobileMenu.classList.add('hidden', '-translate-y-4', 'opacity-0');
                mobileMenu.classList.remove('translate-y-0', 'opacity-100');
                toggleBtn.querySelector('span').textContent = 'menu';
            }
        });

        document.addEventListener('click', (e) => {
            if (!mobileMenu.contains(e.target) && !toggleBtn.contains(e.target)) {
                mobileMenu.classList.remove('translate-y-0', 'opacity-100');
                mobileMenu.classList.add('-translate-y-4', 'opacity-0');
                toggleBtn.querySelector('span').textContent = 'menu';
                setTimeout(() => {
                    if (mobileMenu.classList.contains('opacity-0')) {
                        mobileMenu.classList.add('hidden');
                    }
                }, 300);
            }
        });
    }

    // Micro-interactions and atmospheric effects
    document.querySelectorAll('button, a').forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            if(btn.classList.contains('gradient-primary')) {
                btn.style.filter = 'brightness(1.1)';
            }
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.filter = 'brightness(1)';
        });
    });

    // Simple scroll reveal for cards
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('opacity-100', 'translate-y-0');
                entry.target.classList.remove('opacity-0', 'translate-y-8');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.glass').forEach(el => {
        el.classList.add('transition-all', 'duration-700', 'opacity-0', 'translate-y-8');
        observer.observe(el);
    });
});
