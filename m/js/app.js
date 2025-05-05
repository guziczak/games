/**
 * Główny plik JavaScript obsługujący funkcjonalność strony
 */

// Funkcja inicjalizująca wszystkie funkcjonalności strony
function initApp() {
    // Obsługa preloadera
    setTimeout(function() {
        const preloader = document.getElementById('preloader');
        if (preloader) {
            preloader.classList.add('hidden');
        }
    }, 1000);

    // Inicjalizacja motywu
    initTheme();

    // Mobilna nawigacja - sidebar
    initMobileNav();

    // Obsługa przycisku powrotu do góry
    initBackToTop();

    // Obsługa formularza kontaktowego
    initContactForm();

    // Inicjalizacja paska przewijania
    window.addEventListener('scroll', handleScrollEvents);
}

// Inicjalizacja motywu (ciemny/jasny)
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    
    // Ustawienie początkowego motywu
    const isDarkMode = savedTheme === 'dark' || (!savedTheme && prefersDarkScheme.matches);
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        if (themeIcon) {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        }
    }
    
    // Aktualizacja przełącznika w sidebarze
    const sidebarThemeToggle = document.getElementById('sidebarThemeToggle');
    const sidebarThemeText = document.querySelector('.sidebar-theme span');
    
    if (sidebarThemeToggle) {
        sidebarThemeToggle.checked = isDarkMode;
    }
    
    if (sidebarThemeText) {
        sidebarThemeText.textContent = isDarkMode ? 'Tryb jasny' : 'Tryb ciemny';
    }
    
    // Obsługa przycisku zmiany motywu
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleDarkMode);
    }
}

// Funkcja przełączania motywu ciemnego/jasnego
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');

    // Aktualizacja głównej ikony przełącznika
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
        if (isDarkMode) {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        } else {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        }
    }
    
    // Aktualizacja przełącznika w sidebarze
    const sidebarThemeToggle = document.getElementById('sidebarThemeToggle');
    const sidebarThemeText = document.querySelector('.sidebar-theme span');
    
    if (sidebarThemeToggle) {
        // Unikaj zapętlenia wydarzeń przez tymczasowe usunięcie event listenera
        const oldValue = sidebarThemeToggle.checked;
        if (oldValue !== isDarkMode) {
            sidebarThemeToggle.checked = isDarkMode;
        }
    }
    
    if (sidebarThemeText) {
        sidebarThemeText.textContent = isDarkMode ? 'Tryb jasny' : 'Tryb ciemny';
    }
}

// Inicjalizacja mobilnej nawigacji
function initMobileNav() {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarClose = document.getElementById('sidebarClose');
    const overlay = document.getElementById('overlay');
    
    // Otwieranie sidebar
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            sidebar.classList.add('active');
            overlay.classList.add('active');
            document.body.classList.add('sidebar-open');
        });
    }
    
    // Zamykanie sidebar
    if (sidebarClose) {
        sidebarClose.addEventListener('click', closeSidebar);
    }
    
    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }
}

// Funkcja zamykania sidebara
function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    
    if (sidebar) sidebar.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    document.body.classList.remove('sidebar-open');
}

// Inicjalizacja przycisku powrotu do góry
function initBackToTop() {
    const backToTopBtn = document.getElementById('backToTopBtn');
    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
}

// Obsługa formularza kontaktowego
function initContactForm() {
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleFormSubmit();
        });
    }
}

// Obsługa wysyłki formularza kontaktowego
function handleFormSubmit() {
    const form = document.getElementById('contactForm');
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const subject = document.getElementById('subject').value.trim();
    const message = document.getElementById('message').value.trim();
    
    // Sprawdź, czy formularz jest wypełniony
    if (!name || !email || !subject || !message) {
        showFormAlert('error', 'Wypełnij wszystkie wymagane pola formularza.');
        return;
    }

    // Próba wysłania formularza przez API (endpoint)
    try {
        // W rzeczywistej implementacji tutaj byłby kod wysyłający dane do API
        // np. fetch('/api/contact', { method: 'POST', body: JSON.stringify(formData) })
        
        // Symulacja odpowiedzi API (zakładamy, że wysyłka nie powiodła się)
        const apiSuccess = false;
        
        if (apiSuccess) {
            // Jeśli API działa, pokaż komunikat sukcesu
            showFormAlert('success', 'Twoja wiadomość została wysłana. Dziękujemy za kontakt!');
            form.reset();
        } else {
            // Jeśli API nie działa, użyj fallbacku mailto
            useFallbackMailto(name, email, phone, subject, message);
        }
    } catch (error) {
        console.error('Error submitting form:', error);
        // W przypadku błędu, użyj fallbacku mailto
        useFallbackMailto(name, email, phone, subject, message);
    }
}

// Fallback do mailto
function useFallbackMailto(name, email, phone, subject, message) {
    // Odczytanie adresu email z pliku konfiguracyjnego
    // W przypadku braku, użyj domyślnego
    const contactEmail = 'kontakt@finbilans.pl';
    
    const mailtoLink = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`Imię i nazwisko: ${name}\nEmail: ${email}\nTelefon: ${phone || 'Nie podano'}\n\n${message}`)}`;
    
    // Otwórz klienta poczty
    window.location.href = mailtoLink;
    
    // Pokaż informację, że użyto fallbacku
    showFormAlert('success', 'Otwieranie klienta poczty. Proszę wysłać wiadomość, aby się z nami skontaktować.');
}

// Pokaż alert formularza
function showFormAlert(type, message) {
    const successAlert = document.getElementById('formSuccessAlert');
    const errorAlert = document.getElementById('formErrorAlert');
    
    // Ukryj oba alerty
    if (successAlert) successAlert.style.display = 'none';
    if (errorAlert) errorAlert.style.display = 'none';
    
    if (type === 'success' && successAlert) {
        successAlert.textContent = message;
        successAlert.style.display = 'block';
        
        // Ukryj alert po 5 sekundach
        setTimeout(() => {
            successAlert.style.display = 'none';
        }, 5000);
    } else if (errorAlert) {
        errorAlert.textContent = message;
        errorAlert.style.display = 'block';
        
        // Ukryj alert po 5 sekundach
        setTimeout(() => {
            errorAlert.style.display = 'none';
        }, 5000);
    }
}

// Obsługa zdarzeń przewijania
function handleScrollEvents() {
    if (ticking) return;
    
    ticking = true;
    window.requestAnimationFrame(function() {
        updateScrollProgress();
        handleBackToTopButton();
        handleNavbarOnScroll();
        ticking = false;
    });
}

// Aktualizacja paska postępu przewijania
function updateScrollProgress() {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const scrolled = window.scrollY;
    const progressPercentage = (scrolled / scrollable) * 100;
    
    const scrollProgress = document.getElementById('scrollProgress');
    if (scrollProgress) {
        scrollProgress.style.width = Math.min(100, Math.max(0, progressPercentage)) + '%';
    }
}

// Obsługa przycisku powrotu do góry
function handleBackToTopButton() {
    const backToTopBtn = document.getElementById('backToTopBtn');
    if (!backToTopBtn) return;

    if (window.scrollY > 300) {
        backToTopBtn.classList.add('visible');
    } else {
        backToTopBtn.classList.remove('visible');
    }
}

// Obsługa paska nawigacji przy przewijaniu
function handleNavbarOnScroll() {
    const header = document.getElementById('header');
    if (!header) return;

    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
}

// Śledzenie stanu przewijania
let ticking = false;
window.addEventListener('scroll', function() {
    if (!ticking) {
        handleScrollEvents();
    }
});

// Inicjalizacja aplikacji po załadowaniu strony
document.addEventListener('DOMContentLoaded', initApp);