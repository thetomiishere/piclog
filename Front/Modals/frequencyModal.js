import { ui } from '../Pages/dictionary.js';
import { setPageDisabled } from '../Pages/trivia.js';
import { addFreq } from '../Services/frequencyService.js';

export function addwDate(freqID, dateStr, username) {
    const modal = document.getElementById('frequencyModal');
    const dateInput = document.getElementById('freqLogDate');
    const numInput = document.getElementById('freqNumber');
    const saveBtn = document.getElementById('saveFreqBtn');
    const closeBtn = document.getElementById('closeFreqModal');
    const modalTitle = modal.querySelector('h3');
    const valueLabel = modal.querySelector('label[for="freqNumber"]');
    
    if (modalTitle) modalTitle.textContent = ui.log_entry_title;
    if (valueLabel) valueLabel.textContent = ui.value_label;
    numInput.placeholder = ui.enter_number_placeholder;
    saveBtn.textContent = ui.save_btn;
    closeBtn.textContent = ui.cancel_btn;

    dateInput.value = dateStr;
    numInput.value = ""; 
    modal.style.display = "flex";
    numInput.focus();

    return new Promise((resolve) => {
        const cleanup = () => {
            modal.style.display = "none";
            saveBtn.onclick = null;
            closeBtn.onclick = null;
        };

        saveBtn.onclick = async () => {
            const val = numInput.value.trim();
            
            if (val === "") {
                alert(ui.value_label.replace(':', '') + " ?");
                return;
            }
            try {
                setPageDisabled(true);
                const result = await addFreq(freqID, dateStr, val, username);
                if (result.success) {
                    cleanup();
                    alert(ui.added_success);
                    resolve({ success: true });
                } else {
                    alert(ui.added_failed);
                }
            } catch(err){
                console.log(err);
            } finally {
                setPageDisabled(false);
            }
            
        };

        closeBtn.onclick = () => {
            cleanup();
            resolve({ success: false });
        };
    });
}

export function editTableName(currentName) {
    const modal = document.getElementById('createModal');
    const nameInput = document.getElementById('newInputName');
    const colorContainer = document.getElementById('colorPickerContainer');
    const confirmBtn = document.getElementById('confirmCreateBtn');
    const cancelBtn = document.getElementById('cancelCreateBtn');

    document.getElementById('createModalTitle').textContent = ui.edit_name_title;
    confirmBtn.textContent = ui.save_btn;
    cancelBtn.textContent = ui.cancel_btn;
    colorContainer.style.display = "none";
    
    modal.style.display = "flex";
    nameInput.value = currentName;
    nameInput.focus();

    return new Promise((resolve) => {
        confirmBtn.onclick = () => {
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