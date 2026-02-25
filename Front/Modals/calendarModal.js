import { ui } from '../Pages/dictionary.js';
import { setPageDisabled } from '../Pages/trivia.js';
import { addCell, hasPhoto } from '../Services/calendarService.js';

export function addwDate(calendarID, dateString, username) {
    const modal = document.getElementById('uploadModal');
    const logDateInput = document.getElementById('logDate');
    const saveBtn = document.getElementById('saveBtn');
    const noUpdateBtn = document.getElementById('noUpdateBtn');
    const cancelBtn = document.getElementById('closeModal');
    const modalTitle = modal.querySelector('h3');

    if (modalTitle) modalTitle.textContent = ui.upload_photo_title;
    noUpdateBtn.textContent = ui.no_update_btn;
    saveBtn.textContent = ui.save_btn;
    cancelBtn.textContent = ui.cancel_btn;
    
    logDateInput.value = dateString;
    modal.style.display = "flex";

    return new Promise((resolve) => {
        noUpdateBtn.onclick = async () => {
            const result = await addCell(calendarID, logDateInput.value, "none", username);
            if (result.success) {
                resetInput();
                modal.style.display = "none";
                alert(ui.added_success);
                resolve(result);
            } else {
                alert(ui.added_failed);
            }
        };

        saveBtn.onclick = async () => {
            const selectedDate = logDateInput.value;
            const photoInput = document.getElementById('photoInput');
            const file = photoInput.files[0];
            if (!file) {
                alert(ui.select_photo_alert);
                return;
            }

            const isOccupied = await hasPhoto(calendarID, selectedDate);
            if (isOccupied) {
                alert(`${selectedDate} ${ui.already_has_photo}`);
                resetInput();
                modal.style.display = "none";
                resolve({ success: false, reason: 'occupied' });
                return;
            }

            try {
                setPageDisabled(true);
                const compressedBase64 = await compressImage(file);
                const result = await addCell(calendarID, selectedDate, compressedBase64, username);

                if (result.success) {
                    resetInput();
                    modal.style.display = "none";
                    alert(ui.added_success);
                    resolve(result);
                } else {
                    alert(ui.added_failed);
                }
            } catch (err) {
                console.log(err);
            } finally {
                setPageDisabled(false);
            }
            
        };

        cancelBtn.onclick = () => {
            resetInput();
            modal.style.display = "none";
            resolve({ success: false });
        };
    });
}

export function editTableName(currentName) {
    const modal = document.getElementById('createModal');
    const nameInput = document.getElementById('newInputName');
    const colorContainer = document.getElementById('colorPickerContainer');
    const saveBtn = document.getElementById('confirmCreateBtn');
    const cancelBtn = document.getElementById('cancelCreateBtn');

    document.getElementById('createModalTitle').textContent = ui.edit_name_title;
    saveBtn.textContent = ui.save_btn;
    cancelBtn.textContent = ui.cancel_btn;

    colorContainer.style.display = "none";
    
    modal.style.display = "flex";
    nameInput.value = currentName;
    nameInput.focus();

    return new Promise((resolve) => {
        saveBtn.onclick = () => {
            const name = nameInput.value.trim();
            if (name) {
                modal.style.display = "none";
                resolve(name);
            }
        };
        cancelBtn.onclick = () => {
            modal.style.display = "none";
            resolve(null);
        };
    });
}

function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800; 
                const scale = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scale;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                // 0.7 quality is the "sweet spot" for mobile photos
                resolve(canvas.toDataURL('image/jpeg', 0.7)); 
            };
        };
    });
}

function resetInput() {
    const photoInput = document.getElementById('photoInput');
    if (photoInput) photoInput.value = ""; 
}