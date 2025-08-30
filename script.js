// Smooth scrolling for anchor links
document.addEventListener('DOMContentLoaded', function() {
    // Add smooth scrolling behavior
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Add click handlers for CTA buttons
    const ctaButtons = document.querySelectorAll('.cta-button, .main-cta');
    ctaButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Add a ripple effect
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = event.clientX - rect.left - size / 2;
            const y = event.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');
            
            this.appendChild(ripple);
            
            // Remove ripple after animation
            setTimeout(() => {
                ripple.remove();
            }, 600);
            
            // Here you would typically redirect to a signup page or open a modal
            console.log('CTA button clicked!');
            // Example: window.location.href = '/signup';
        });
    });

    // Add scroll-based animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe elements for scroll animations
    const animatedElements = document.querySelectorAll('.feature-card, .metric-card');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    // Add header background on scroll
    const header = document.querySelector('.header');
    window.addEventListener('scroll', function() {
        if (window.scrollY > 100) {
            header.style.backgroundColor = 'rgba(26, 26, 26, 0.95)';
            header.style.backdropFilter = 'blur(10px)';
        } else {
            header.style.backgroundColor = '#1a1a1a';
            header.style.backdropFilter = 'none';
        }
    });

    // Hero title loads instantly (typing animation removed)

    // Add counter animation for dashboard metrics
    const metricValues = document.querySelectorAll('.metric-value');
    const animateCounter = (element, target) => {
        let current = 0;
        const increment = target / 100;
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            
            if (element.textContent.includes('$')) {
                element.textContent = '$' + Math.floor(current).toLocaleString();
            } else if (element.textContent.includes('%')) {
                element.textContent = Math.floor(current * 10) / 10 + '%';
            } else {
                element.textContent = Math.floor(current);
            }
        }, 20);
    };

    // Trigger counter animation when dashboard comes into view
    const dashboardObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const values = entry.target.querySelectorAll('.metric-value');
                values.forEach((value, index) => {
                    const targets = [47832, 127, 94.7];
                    setTimeout(() => {
                        animateCounter(value, targets[index]);
                    }, index * 200);
                });
                dashboardObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    const dashboard = document.querySelector('.dashboard');
    if (dashboard) {
        dashboardObserver.observe(dashboard);
    }

    // Module card expansion functionality
    const moduleCards = document.querySelectorAll('.module-card');
    moduleCards.forEach(card => {
        const chevron = card.querySelector('.module-chevron');
        chevron.addEventListener('click', function() {
            card.classList.toggle('expanded');
        });
    });

    // FAQ accordion functionality
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', () => {
            // Close all other FAQ items
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                }
            });
            
            // Toggle current item
            item.classList.toggle('active');
        });
    });
    
    // FAQ filter functionality
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Get filter value
            const filter = button.getAttribute('data-filter');
            
            // Filter FAQ items
            const faqItems = document.querySelectorAll('.faq-item');
            
            faqItems.forEach(item => {
                const category = item.getAttribute('data-category');
                
                if (filter === 'all' || category === filter) {
                    item.style.display = 'block';
                    // Add smooth animation
                    item.style.opacity = '0';
                    item.style.transform = 'translateY(20px)';
                    
                    setTimeout(() => {
                        item.style.opacity = '1';
                        item.style.transform = 'translateY(0)';
                    }, 100);
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });
});

// Add CSS for ripple effect
const style = document.createElement('style');
style.textContent = `
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: scale(0);
        animation: ripple-animation 0.6s linear;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    .cta-button, .main-cta {
        position: relative;
        overflow: hidden;
    }
`;
document.head.appendChild(style);
