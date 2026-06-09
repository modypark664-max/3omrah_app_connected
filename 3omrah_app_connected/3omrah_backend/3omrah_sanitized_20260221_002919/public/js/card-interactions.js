// Card interactions JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const activeUser = (typeof window !== 'undefined') ? (window.__appUser || window.user) : null;
    if (activeUser) {
        loadUserFavorites();
    }
});

// Load user favorites and update UI
async function loadUserFavorites() {
    try {
        const response = await fetch('/api/user/favorites');
        const data = await response.json();
        
        console.log('Loaded favorites:', data); // Debug log
        console.log('All favorite buttons on page:', document.querySelectorAll('.favorite-btn')); // Debug log
        
        if (data.favorites) {
            data.favorites.forEach(favorite => {
                const favoriteBtn = document.querySelector(`.favorite-btn[data-card-id="${favorite._id}"]`);
                console.log('Looking for button with card ID:', favorite._id); // Debug log
                console.log('Found favorite button for card:', favorite._id, favoriteBtn); // Debug log
                if (favoriteBtn) {
                    favoriteBtn.classList.add('is-favorite');
                    console.log('Added is-favorite class to button'); // Debug log
                } else {
                    console.log('Button not found for card:', favorite._id); // Debug log
                }
            });
        }
    } catch (error) {
        console.error('Error loading favorites:', error);
    }
}

// Toggle favorite status
async function toggleFavorite(cardId) {
    const favoriteBtn = document.querySelector(`.favorite-btn[data-card-id="${cardId}"]`);
    if (!favoriteBtn) return;
    
    // Add loading state
    favoriteBtn.classList.add('loading');
    favoriteBtn.disabled = true;
    
    try {
        const response = await fetch(`/api/favorites/toggle/${cardId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (data.isFavorite) {
                favoriteBtn.classList.add('is-favorite');
                showToast(data.message || 'تم إضافة الباقة إلى المفضلة', 'success');
            } else {
                favoriteBtn.classList.remove('is-favorite');
                showToast(data.message || 'تم إزالة الباقة من المفضلة', 'info');
            }
        } else {
            showToast(data.message || 'حدث خطأ أثناء العملية', 'error');
        }
    } catch (error) {
        console.error('Error toggling favorite:', error);
        showToast('حدث خطأ في الاتصال بالخادم', 'error');
    } finally {
        // Remove loading state
        favoriteBtn.classList.remove('loading');
        favoriteBtn.disabled = false;
    }
}

// Share card function
async function shareCard(cardId, cardCode) {
    const cardUrl = `${window.location.origin}/card/${cardId}`;
    const shareTitle = `تحقق من هذه الباقة: ${cardCode}`;
    const shareText = `اكتشف هذه الباقة المميزة على منصة رحلة عمرة`;
    
    // Check if Web Share API is supported
    if (navigator.share) {
        try {
            await navigator.share({
                title: shareTitle,
                text: shareText,
                url: cardUrl
            });
            showToast('تم مشاركة الباقة بنجاح', 'success');
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error sharing:', error);
                // Fallback to copy link
                copyToClipboard(cardUrl);
            }
        }
    } else {
        // Fallback: copy link to clipboard
        copyToClipboard(cardUrl);
    }
}

// Copy to clipboard fallback
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('تم نسخ الرابط إلى الحافظة', 'success');
        }).catch(err => {
            console.error('Failed to copy: ', err);
            showToast('فشل في نسخ الرابط', 'error');
        });
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            showToast('تم نسخ الرابط إلى الحافظة', 'success');
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
            showToast('فشل في نسخ الرابط', 'error');
        }
        document.body.removeChild(textArea);
    }
}

// Toast notification function
function showToast(message, type = 'info') {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => toast.remove());
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">
                ${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}
            </span>
            <span class="toast-message">${message}</span>
        </div>
    `;
    
    // Add styles
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        font-family: 'Tajawal', sans-serif;
        font-size: 14px;
        max-width: 300px;
        animation: slideInRight 0.3s ease-out;
        direction: rtl;
    `;
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        .toast-content {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .toast-icon {
            font-weight: bold;
            font-size: 16px;
        }
    `;
    
    if (!document.querySelector('#toast-styles')) {
        style.id = 'toast-styles';
        document.head.appendChild(style);
    }
    
    // Add to document
    document.body.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'slideInRight 0.3s ease-out reverse';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }
    }, 3000);
}
