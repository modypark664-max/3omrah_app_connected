// Admin Dashboard JavaScript
let hotelCount = 1;
let housingCount = 1;

function switchTab(tabName) {
    console.log('Switching to tab:', tabName);
    
    // Find the parent card management section
    const cardManagementSection = event.target.closest('.dashboard-card');
    if (!cardManagementSection) return;
    
    const tabs = cardManagementSection.querySelectorAll('.tab');
    const tabContents = cardManagementSection.querySelectorAll('.tab-content');
    
    // Remove active class from all tabs and contents in this section
    tabs.forEach(tab => tab.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    
    // Add active class to clicked tab and corresponding content
    event.target.classList.add('active');
    const targetContent = document.getElementById(tabName);
    if (targetContent) {
        targetContent.classList.add('active');
    }
}

function switchUserTab(tabName) {
    console.log('Switching to user tab:', tabName);
    
    // Find the parent user management section
    const userManagementSection = event.target.closest('.dashboard-card');
    if (!userManagementSection) return;
    
    const tabs = userManagementSection.querySelectorAll('.tab');
    const tabContents = userManagementSection.querySelectorAll('.tab-content');
    
    // Remove active class from all tabs and contents in this section
    tabs.forEach(tab => tab.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    
    // Add active class to clicked tab and corresponding content
    event.target.classList.add('active');
    const targetContent = document.getElementById(tabName);
    if (targetContent) {
        targetContent.classList.add('active');
    }
}

function addHotel() {
    hotelCount++;
    const container = document.getElementById('hotels-container');
    const newHotel = document.createElement('div');
    newHotel.className = 'hotel-item';
    newHotel.innerHTML = `
        <div class="hotel-grid">
            <div class="form-group">
                <label>عدد الليالي:</label>
                <input type="number" class="hotel-nights" min="1" required>
            </div>
            <div class="form-group">
                <label>اسم الفندق:</label>
                <input type="text" class="hotel-name" required>
            </div>
            <div class="form-group">
                <label>نوع الفندق:</label>
                <select class="hotel-type" required>
                    <option value="">اختر النوع</option>
                    <option value="اقتصادي">اقتصادي</option>
                    <option value="سياحي">سياحي</option>
                    <option value="VIP">VIP</option>
                </select>
            </div>
        </div>
        <div class="form-grid">
            <div class="form-group">
                <label>الموقع:</label>
                <input type="text" class="hotel-location" required>
            </div>
            <div class="form-group">
                <label>يشمل الطعام:</label>
                <select class="hotel-food" required>
                    <option value="">اختر</option>
                    <option value="true">نعم</option>
                    <option value="false">لا</option>
                </select>
            </div>
        </div>
        <button type="button" class="remove-btn" data-action="removeHotel">حذف هذا الفندق</button>
    `;
    container.appendChild(newHotel);
    
    // Add event listener to the new remove button
    const removeBtn = newHotel.querySelector('[data-action="removeHotel"]');
    removeBtn.addEventListener('click', function(e) {
        e.preventDefault();
        removeHotel(this);
    });
}

function addHousing() {
    housingCount++;
    const container = document.getElementById('housing-container');
    const newHousing = document.createElement('div');
    newHousing.className = 'housing-item';
    newHousing.innerHTML = `
        <div class="housing-grid">
            <div class="form-group">
                <label>نوع الغرفة:</label>
                <input type="text" class="room-type" required placeholder="مثل: فردي، مزدوج، ثلاثي">
            </div>
            <div class="form-group">
                <label>السعر:</label>
                <input type="number" class="room-price" min="0" required>
            </div>
        </div>
        <button type="button" class="remove-btn" data-action="removeHousing">حذف هذا الخيار</button>
    `;
    container.appendChild(newHousing);
    
    // Add event listener to the new remove button
    const removeBtn = newHousing.querySelector('[data-action="removeHousing"]');
    removeBtn.addEventListener('click', function(e) {
        e.preventDefault();
        removeHousing(this);
    });
}

function removeHotel(button) {
    button.parentElement.remove();
}

function removeHousing(button) {
    button.parentElement.remove();
}

function generatePlaneJSON() {
    const hotels = [];
    const housingOptions = [];
    
    document.querySelectorAll('.hotel-item').forEach(item => {
        const nights = parseInt(item.querySelector('.hotel-nights').value);
        const hotel = item.querySelector('.hotel-name').value;
        const hotel_type = item.querySelector('.hotel-type').value;
        const location = item.querySelector('.hotel-location').value;
        const comes_with_food = item.querySelector('.hotel-food').value === 'true';
        
        if (nights && hotel && hotel_type && location && item.querySelector('.hotel-food').value) {
            hotels.push({
                nights,
                hotel,
                hotel_type,
                location,
                comes_with_food
            });
        }
    });
    
    document.querySelectorAll('.housing-item').forEach(item => {
        const roomType = item.querySelector('.room-type').value;
        const price = parseFloat(item.querySelector('.room-price').value);
        
        if (roomType && price >= 0) {
            housingOptions.push({
                roomType,
                price
            });
        }
    });
    
    return {
        hotel: hotels,
        housingOptions: housingOptions
    };
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Form submission handler
    const cardForm = document.getElementById('cardForm');
    if (cardForm) {
        cardForm.addEventListener('submit', function(e) {
            try {
                const planeData = generatePlaneJSON();
                document.getElementById('plane').value = JSON.stringify(planeData);
                
                // Collect array data and create hidden inputs
                const includedServices = collectArrayData('included-services-container');
                const notIncludedServices = collectArrayData('not-included-services-container');
                const notes = collectArrayData('notes-container');
                const cancellingRules = collectArrayData('cancelling-rules-container');

                // Remove any existing hidden array inputs
                cardForm.querySelectorAll('input[name$="_array_data"]').forEach(input => input.remove());
                
                // Add new hidden inputs for arrays
                if (includedServices.length > 0) {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = 'included_services';
                    input.value = JSON.stringify(includedServices);
                    cardForm.appendChild(input);
                }
                
                if (notIncludedServices.length > 0) {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = 'not_included_services';
                    input.value = JSON.stringify(notIncludedServices);
                    cardForm.appendChild(input);
                }
                
                if (notes.length > 0) {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = 'notes';
                    input.value = JSON.stringify(notes);
                    cardForm.appendChild(input);
                }
                
                if (cancellingRules.length > 0) {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = 'cancelling_rules';
                    input.value = JSON.stringify(cancellingRules);
                    cardForm.appendChild(input);
                }
                
                if (planeData.hotel.length === 0) {
                    e.preventDefault();
                    alert('يجب إضافة فندق واحد على الأقل');
                    return;
                }
                
                if (planeData.housingOptions.length === 0) {
                    e.preventDefault();
                    alert('يجب إضافة خيار غرفة واحد على الأقل');
                    return;
                }
                
            } catch (error) {
                e.preventDefault();
                alert('يرجى التأكد من صحة البيانات المدخلة');
                console.error(error);
            }
        });
    }
    
    // Show success/error messages from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'partner-banner-updated') {
        alert('تم حفظ شعار الشراكة بنجاح!');
        // Remove the parameter from URL
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('success') === 'card-created') {
        alert('تم إنشاء البطاقة بنجاح!');
        // Remove the parameter from URL
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('error') === 'partner-banner-failed') {
        alert('حدث خطأ أثناء حفظ شعار الشراكة');
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    console.log('Admin dashboard loaded successfully');
    
    // Add event listeners for tabs (as backup to onclick)
    document.querySelectorAll('[onclick*="switchTab"]').forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            const match = this.getAttribute('onclick').match(/switchTab\('([^']+)'\)/);
            if (match) {
                switchTab(match[1]);
            }
        });
    });
    
    document.querySelectorAll('[onclick*="switchUserTab"]').forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            const match = this.getAttribute('onclick').match(/switchUserTab\('([^']+)'\)/);
            if (match) {
                switchUserTab(match[1]);
            }
        });
    });
    
    // Add event listeners for add buttons
    const addHotelBtn = document.querySelector('[data-action="addHotel"]');
    if (addHotelBtn) {
        addHotelBtn.addEventListener('click', function(e) {
            e.preventDefault();
            addHotel();
        });
    }
    
    const addHousingBtn = document.querySelector('[data-action="addHousing"]');
    if (addHousingBtn) {
        addHousingBtn.addEventListener('click', function(e) {
            e.preventDefault();
            addHousing();
        });
    }
    
    // Handle edit and delete card actions
    document.addEventListener('click', function(e) {
        if (e.target.dataset.action === 'editCard') {
            const cardId = e.target.dataset.cardId;
            if (cardId) {
                window.location.href = `/admin/edit-card/${cardId}`;
            }
        }
        
        if (e.target.dataset.action === 'deleteCard') {
            const cardId = e.target.dataset.cardId;
            const cardCode = e.target.dataset.cardCode;
            
            if (cardId && confirm(`هل أنت متأكد من حذف البطاقة "${cardCode}"؟\nهذا الإجراء لا يمكن التراجع عنه.`)) {
                deleteCard(cardId);
            }
        }
        
        // Handle array actions
        if (e.target.dataset.action === 'addIncludedService') {
            e.preventDefault();
            addArrayItem('included-services-container', 'اكتب الخدمة هنا');
        }
        
        if (e.target.dataset.action === 'addNotIncludedService') {
            e.preventDefault();
            addArrayItem('not-included-services-container', 'اكتب الخدمة هنا');
        }
        
        if (e.target.dataset.action === 'addNote') {
            e.preventDefault();
            addArrayItem('notes-container', 'اكتب الملاحظة هنا', true);
        }
        
        if (e.target.dataset.action === 'addCancellingRule') {
            e.preventDefault();
            addArrayItem('cancelling-rules-container', 'اكتب قاعدة الإلغاء هنا', true);
        }
    });
});

// Delete card function
async function deleteCard(cardId) {
    try {
        const response = await fetch(`/admin/delete-card/${cardId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('تم حذف البطاقة بنجاح');
            // Refresh the page to update the cards list
            window.location.reload();
        } else {
            alert('فشل في حذف البطاقة: ' + result.message);
        }
    } catch (error) {
        console.error('Error deleting card:', error);
        alert('حدث خطأ أثناء حذف البطاقة');
    }
}

// Array management functions
function addArrayItem(containerId, placeholder, isTextarea = false) {
    const container = document.getElementById(containerId);
    const arrayItem = document.createElement('div');
    arrayItem.className = 'array-item';
    
    if (isTextarea) {
        arrayItem.innerHTML = `
            <textarea class="array-textarea" placeholder="${placeholder}"></textarea>
            <button type="button" class="remove-btn" onclick="removeArrayItem(this)">حذف</button>
        `;
    } else {
        arrayItem.innerHTML = `
            <input type="text" class="array-input" placeholder="${placeholder}">
            <button type="button" class="remove-btn" onclick="removeArrayItem(this)">حذف</button>
        `;
    }
    
    container.appendChild(arrayItem);
}

function removeArrayItem(button) {
    const container = button.parentElement.parentElement;
    const items = container.querySelectorAll('.array-item');
    if (items.length > 1) {
        button.parentElement.remove();
    } else {
        alert('يجب الاحتفاظ بعنصر واحد على الأقل');
    }
}

function collectArrayData(containerId) {
    const container = document.getElementById(containerId);
    const items = container.querySelectorAll('.array-input, .array-textarea');
    const data = [];
    
    items.forEach(item => {
        const value = item.value.trim();
        if (value) {
            data.push(value);
        }
    });
    
    return data;
}
