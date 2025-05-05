/**
 * Data Loader - ładuje dane z plików JSON do HTML
 */

// Funkcja do ładowania plików JSON
async function loadJSON(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Nie udało się załadować ${url}: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Błąd podczas ładowania ${url}:`, error);
        return null;
    }
}

// Funkcja do wypełniania menu
async function loadMenu() {
    const data = await loadJSON('data/menu.json');
    if (!data) return;

    // Wypełnij główne menu
    const navMenu = document.getElementById('navMenu');
    if (navMenu) {
        navMenu.innerHTML = data.menuItems.map(item => 
            `<li><a href="${item.link}" class="nav-link ${item.id === 'home' ? 'active' : ''}">${item.text}</a></li>`
        ).join('');
    }

    // Wypełnij boczne menu (sidebar)
    const sidebarNav = document.querySelector('.sidebar-nav');
    if (sidebarNav) {
        // Pobierz aktualną lokalizację, aby móc ustalić aktywny element
        const currentPath = window.location.hash || '#';
        
        // Generuj elementy menu
        const menuItemsHTML = data.menuItems.map(item => {
            const isActive = item.link === currentPath || 
                           (currentPath === '' && item.id === 'home');
            
            return `<div class="sidebar-nav-item">
                <a href="${item.link}" class="sidebar-nav-link ${isActive ? 'active' : ''}">
                    <span class="sidebar-nav-icon">
                        <i class="fas ${item.icon}"></i>
                    </span>
                    ${item.text}
                </a>
            </div>`;
        }).join('');
        
        sidebarNav.innerHTML = menuItemsHTML;
    }
    
    // Wypełnij szybkie akcje
    const quickActions = document.querySelector('.quick-actions');
    if (quickActions) {
        quickActions.innerHTML = data.quickActions.map(action => 
            `<a href="${action.link}" class="quick-action-btn" ${action.id === 'location' ? 'target="_blank" rel="noopener"' : ''}>
                <div class="quick-action-icon" style="background-color: ${action.color}">
                    <i class="fas ${action.icon}"></i>
                </div>
                <span class="quick-action-text">${action.text}</span>
            </a>`
        ).join('');
    }
    
    // Inicjalizuj przełącznik motywu
    const sidebarThemeToggle = document.getElementById('sidebarThemeToggle');
    if (sidebarThemeToggle) {
        // Ustaw początkowy stan przełącznika zgodnie z aktualnym motywem
        sidebarThemeToggle.checked = document.body.classList.contains('dark-mode');
        
        // Dodaj obsługę zdarzenia
        sidebarThemeToggle.addEventListener('change', toggleDarkMode);
    }

    // Dodaj obsługę zamykania sidebar po kliknięciu w link
    const sidebarLinks = document.querySelectorAll('.sidebar-nav-link');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', closeSidebar);
    });
    
    // Dodaj obsługę zamykania sidebar po kliknięciu w przycisk szybkiej akcji
    const quickActionBtns = document.querySelectorAll('.quick-action-btn');
    quickActionBtns.forEach(btn => {
        btn.addEventListener('click', closeSidebar);
    });

    // Wypełnij linki w stopce
    const footerLinks = document.querySelector('.footer-links');
    if (footerLinks) {
        const linksContainer = document.querySelectorAll('.footer-links');
        if (linksContainer.length > 1) {
            linksContainer[1].innerHTML = data.footerLinks.map(item => 
                `<a href="${item.link}" class="footer-link">${item.text}</a>`
            ).join('');
        }
    }
}

// Funkcja do wypełniania usług
async function loadServices() {
    const data = await loadJSON('data/services.json');
    if (!data) return;

    const servicesGrid = document.querySelector('.services-grid');
    if (servicesGrid) {
        servicesGrid.innerHTML = data.services.map(service => 
            `<div class="service-card" id="service-${service.id}">
                <div class="service-icon">
                    <i class="fas ${service.icon}"></i>
                </div>
                <h3 class="service-title">${service.title}</h3>
                <p class="service-desc">${service.description}</p>
                <a href="${service.link}" class="service-link">
                    <span>Dowiedz się więcej</span>
                    <i class="fas fa-arrow-right"></i>
                </a>
            </div>`
        ).join('');
    }

    // Wypełnij usługi w stopce
    const footerServiceLinks = document.querySelectorAll('.footer-links');
    if (footerServiceLinks && footerServiceLinks.length > 0) {
        footerServiceLinks[0].innerHTML = data.services.map(service => 
            `<a href="#services" class="footer-link">${service.title}</a>`
        ).join('');
    }
}

// Funkcja do wypełniania cech/właściwości
async function loadFeatures() {
    const data = await loadJSON('data/features.json');
    if (!data) return;

    const featuresGrid = document.querySelector('.about-features');
    if (featuresGrid) {
        featuresGrid.innerHTML = data.features.map(feature => 
            `<div class="feature-item">
                <div class="feature-icon">
                    <i class="fas ${feature.icon}"></i>
                </div>
                <div class="feature-text">${feature.text}</div>
            </div>`
        ).join('');
    }
}

// Funkcja do wypełniania informacji kontaktowych
async function loadContact() {
    const data = await loadJSON('data/contact.json');
    if (!data) return;

    // Wypełnij metody kontaktu w sekcji kontaktowej
    const contactInfo = document.querySelector('.contact-info');
    if (contactInfo) {
        const contactMethods = contactInfo.querySelectorAll('.contact-method');
        if (contactMethods.length === 0) {
            const methodsHTML = data.contactInfo.map(contact => {
                // Dla adresu dodaj link do Google Maps
                if (contact.id === 'address') {
                    // Używamy adresu zamiast koordynatów, aby zapewnić wyświetlanie pinezki
                    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.value)}`;
                    return `<div class="contact-method">
                        <div class="contact-icon">
                            <i class="fas ${contact.icon}"></i>
                        </div>
                        <div class="contact-text">
                            <strong>${contact.title}</strong>
                            <a href="${mapUrl}" target="_blank" rel="noopener" class="address-link">
                                <span>${contact.value}</span>
                            </a>
                        </div>
                    </div>`;
                } 
                // Dla telefonu dodaj link tel:
                else if (contact.id === 'phone') {
                    return `<div class="contact-method">
                        <div class="contact-icon">
                            <i class="fas ${contact.icon}"></i>
                        </div>
                        <div class="contact-text">
                            <strong>${contact.title}</strong>
                            <a href="tel:${contact.value.replace(/\s/g, '')}" class="phone-link">
                                <span>${contact.value}</span>
                            </a>
                        </div>
                    </div>`;
                }
                // Dla emaila dodaj link mailto:
                else if (contact.id === 'email') {
                    return `<div class="contact-method">
                        <div class="contact-icon">
                            <i class="fas ${contact.icon}"></i>
                        </div>
                        <div class="contact-text">
                            <strong>${contact.title}</strong>
                            <a href="mailto:${contact.value}" class="email-link">
                                <span>${contact.value}</span>
                            </a>
                        </div>
                    </div>`;
                }
                // Dla pozostałych standardowy format
                else {
                    return `<div class="contact-method">
                        <div class="contact-icon">
                            <i class="fas ${contact.icon}"></i>
                        </div>
                        <div class="contact-text">
                            <strong>${contact.title}</strong>
                            <span>${contact.value}</span>
                        </div>
                    </div>`;
                }
            }).join('');
            
            // Znajdź paragraf po którym chcemy wstawić metody kontaktu
            const contactDesc = contactInfo.querySelector('.contact-desc');
            if (contactDesc) {
                contactDesc.insertAdjacentHTML('afterend', methodsHTML);
            }
        }
    }

    // Wypełnij metody kontaktu w sidebarze
    const sidebarFooter = document.querySelector('.sidebar-footer');
    if (sidebarFooter) {
        sidebarFooter.innerHTML = data.contactInfo.slice(0, 2).map(contact => 
            `<div class="contact-method">
                <div class="contact-icon">
                    <i class="fas ${contact.icon}"></i>
                </div>
                <div class="contact-text">
                    <strong>${contact.title}</strong>
                    <span>${contact.value}</span>
                </div>
            </div>`
        ).join('');
    }

    // Wypełnij media społecznościowe
    const socialLinks = document.querySelector('.social-links');
    if (socialLinks) {
        socialLinks.innerHTML = data.socialMedia.map(social => 
            `<a href="${social.url}" class="social-link">
                <i class="${social.icon}"></i>
            </a>`
        ).join('');
    }

    // Wypełnij dane kontaktowe w stopce
    const footerContact = document.querySelector('.footer-col:last-child');
    if (footerContact) {
        const contactContainer = footerContact.querySelector('h4 + div');
        if (!contactContainer) {
            const contactHTML = data.contactInfo.map(contact => 
                `<div class="footer-contact">
                    <i class="fas ${contact.icon}"></i>
                    <span>${contact.value}</span>
                </div>`
            ).join('');
            
            // Znajdź nagłówek po którym chcemy wstawić metody kontaktu
            const footerTitle = footerContact.querySelector('.footer-title');
            if (footerTitle) {
                footerTitle.insertAdjacentHTML('afterend', contactHTML);
            }
        }
    }
}

// Funkcja do wypełniania treści głównych
async function loadConfigData() {
    const data = await loadJSON('data/config.json');
    if (!data) return;

    // Ustawienie ogólnych danych strony
    document.title = `${data.company.name} - ${data.company.tagline}`;
    
    // Logo
    const logoElements = document.querySelectorAll('.logo, .footer-logo');
    logoElements.forEach(logo => {
        const logoIcon = logo.querySelector('.logo-icon i');
        if (logoIcon) {
            logoIcon.className = '';
            logoIcon.classList.add('fas', data.company.logo);
        }
        
        const logoText = logo.querySelector('span');
        if (logoText) {
            logoText.textContent = data.company.name;
        }
    });
    
    // Sekcja hero
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
        heroTitle.innerHTML = data.hero.title.replace(' dla Twojego biznesu', ' <span>dla Twojego biznesu</span>');
    }
    
    const heroSubtitle = document.querySelector('.hero-subtitle');
    if (heroSubtitle) {
        heroSubtitle.textContent = data.hero.subtitle;
    }
    
    const heroPrimaryBtn = document.querySelector('.hero-btn:not(.secondary)');
    if (heroPrimaryBtn) {
        const btnText = heroPrimaryBtn.querySelector('span');
        if (btnText) {
            btnText.textContent = data.hero.primaryButtonText;
        }
    }
    
    const heroSecondaryBtn = document.querySelector('.hero-btn.secondary');
    if (heroSecondaryBtn) {
        const btnText = heroSecondaryBtn.querySelector('span');
        if (btnText) {
            btnText.textContent = data.hero.secondaryButtonText;
        }
    }
    
    // Sekcja o nas
    const aboutTitle = document.querySelector('.about-title');
    if (aboutTitle) {
        aboutTitle.textContent = data.about.title;
    }
    
    const aboutSubtitle = document.querySelector('.about-subtitle');
    if (aboutSubtitle) {
        aboutSubtitle.textContent = data.about.subtitle;
    }
    
    const aboutParas = document.querySelectorAll('.about-desc');
    if (aboutParas.length >= 2) {
        aboutParas[0].textContent = data.about.paragraph1;
        aboutParas[1].textContent = data.about.paragraph2;
    }
    
    const aboutBtn = document.querySelector('.about-content .hero-btn');
    if (aboutBtn) {
        const btnText = aboutBtn.querySelector('span');
        if (btnText) {
            btnText.textContent = data.about.buttonText;
        }
    }
    
    // Sekcja usług
    const servicesTitle = document.querySelector('.services .section-title h2');
    if (servicesTitle) {
        servicesTitle.textContent = data.services.title;
    }
    
    const servicesDesc = document.querySelector('.services .section-title p');
    if (servicesDesc) {
        servicesDesc.textContent = data.services.description;
    }
    
    // Sekcja kontaktowa
    const contactTitle = document.querySelector('.contact .section-title h2');
    if (contactTitle) {
        contactTitle.textContent = data.contact.title;
    }
    
    const contactDesc = document.querySelector('.contact .section-title p');
    if (contactDesc) {
        contactDesc.textContent = data.contact.description;
    }
    
    const contactSubtitle = document.querySelector('.contact-subtitle');
    if (contactSubtitle) {
        contactSubtitle.textContent = data.contact.subtitle;
    }
    
    const contactHeading = document.querySelector('.contact-title');
    if (contactHeading) {
        contactHeading.textContent = data.contact.contactTitle;
    }
    
    const contactText = document.querySelector('.contact-info .contact-desc');
    if (contactText) {
        contactText.textContent = data.contact.contactDescription;
    }
    
    // Stopka
    const footerDesc = document.querySelector('.footer-desc');
    if (footerDesc) {
        footerDesc.textContent = data.company.description;
    }
    
    const copyright = document.querySelector('.copyright');
    if (copyright) {
        copyright.textContent = `© ${data.company.copyrightYear} ${data.company.name} - Biuro Rachunkowe. Wszystkie prawa zastrzeżone.`;
    }
    
    // Alerty formularza
    const successAlert = document.getElementById('formSuccessAlert');
    if (successAlert) {
        successAlert.textContent = data.contact.successMessage;
    }
    
    const errorAlert = document.getElementById('formErrorAlert');
    if (errorAlert) {
        errorAlert.textContent = data.contact.errorMessage;
    }
    
    // Przycisk formularza
    const submitBtn = document.querySelector('.form-submit-btn');
    if (submitBtn) {
        const btnText = submitBtn.querySelector('i + span') || submitBtn;
        if (btnText.tagName === 'BUTTON') {
            btnText.innerHTML = `<i class="fas fa-paper-plane"></i> ${data.contact.submitButtonText}`;
        } else {
            btnText.textContent = data.contact.submitButtonText;
        }
    }
}

// Główna funkcja inicjalizująca ładowanie danych
async function initDataLoader() {
    try {
        // Ładowanie wszystkich danych równolegle
        await Promise.all([
            loadConfigData(),
            loadMenu(),
            loadServices(),
            loadFeatures(),
            loadContact()
        ]);
        console.log('Wszystkie dane zostały załadowane pomyślnie!');
    } catch (error) {
        console.error('Błąd podczas ładowania danych:', error);
    }
}

// Uruchomienie ładowania danych po załadowaniu strony
document.addEventListener('DOMContentLoaded', function() {
    // Najpierw ukrywamy preloader
    setTimeout(function() {
        const preloader = document.getElementById('preloader');
        if (preloader) {
            preloader.classList.add('hidden');
        }
        
        // Następnie ładujemy dane
        initDataLoader();
    }, 1000);
});

// Funkcja zamykania sidebara - potrzebna dla eventListenerów dodawanych dynamicznie
function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    if (sidebar) sidebar.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    document.body.classList.remove('sidebar-open');
}

// Funkcja zamykania sidebara używana w event listenerach