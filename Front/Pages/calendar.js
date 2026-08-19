import { ui } from './dictionary.js';
import { addwDate, editTableName } from '../Modals/calendarModal.js';
import { populateOptions, updateDate, setPageDisabled } from './trivia.js';
import { calendarService, deleteCell, updateTableName } from '../Services/calendarService.js';

const session = JSON.parse(localStorage.getItem("currentUser"));
let currentTable = "";
let currentDisplayDate = new Date();
let dateState = {
    year: currentDisplayDate.getFullYear(),
    month: currentDisplayDate.getMonth()
};

export async function calendar(calendarID) {
    currentTable = calendarID;
    
    const titleDisplay = document.getElementById('currentPageTitle');
    if (titleDisplay) {
        titleDisplay.style.cursor = 'pointer';
        
        titleDisplay.onclick = async () => {
            const currentName = titleDisplay.textContent;
            const newName = await editTableName(currentName);
            
            if (newName && newName !== currentName) {
                const res = await updateTableName('calendars', calendarID, newName, session.username);
                if (res.success) {
                    alert(ui.name_updated);
                    location.reload();
                }
            }
        };
    }

    const monthLabel = document.getElementById('monthLabel'); 
    const yearLabel = document.getElementById('yearLabel');
    const prevBtn = document.getElementById('prevMonth');
    const nextBtn = document.getElementById('nextMonth');
    const openBtn = document.getElementById('openModal');

    populateOptions('monthOptions', 0, 11, true, dateState, currentDisplayDate, handleRefresh);
    populateOptions('yearOptions', 2020, 2030, false, dateState, currentDisplayDate, handleRefresh);
    
    monthLabel.onclick = (e) => {
        e.stopPropagation();
        document.getElementById('monthOptions').classList.toggle('active');
        document.getElementById('yearOptions').classList.remove('active');
    };

    yearLabel.onclick = (e) => {
        e.stopPropagation();
        document.getElementById('yearOptions').classList.toggle('active');
        document.getElementById('monthOptions').classList.remove('active');
    };

    window.onclick = () => {
        document.getElementById('monthOptions').classList.remove('active');
        document.getElementById('yearOptions').classList.remove('active');
    };

    prevBtn.onclick = async () => {
        currentDisplayDate.setMonth(currentDisplayDate.getMonth() - 1);
        await updateDate(monthLabel, yearLabel, dateState, currentDisplayDate);
        await renderCalendar(dateState.year, dateState.month);
    };

    nextBtn.onclick = async () => {
        currentDisplayDate.setMonth(currentDisplayDate.getMonth() + 1);
        await updateDate(monthLabel, yearLabel, dateState, currentDisplayDate);
        await renderCalendar(dateState.year, dateState.month);
    };

    openBtn.onclick = async () => {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const result = await addwDate(currentTable, today, session.username);
        if (result.success) {
            try {
                await renderCalendar(dateState.year, dateState.month);
            } catch (err) {
                console.log(err);
            }
        }
    };

    await updateDate(monthLabel, yearLabel, dateState, currentDisplayDate);
    await renderCalendar(dateState.year, dateState.month);

    const screenshotBtn = document.getElementById('screenshotBtn');
    if (screenshotBtn) {
        screenshotBtn.onclick = () => takeScreenshot(dateState);
    }

}

export async function takeScreenshot(dateState = {}) {
    const prevBtn = document.getElementById('prevMonth');
    const nextBtn = document.getElementById('nextMonth');
    const delBtn = document.getElementById('deleteCalendarBtn');
    const addBtn = document.getElementById('openModal');
    const ssBtn = document.getElementById('screenshotBtn');
    const captureArea = document.getElementById('calendarSection');

    if (!captureArea) {
        console.error("Capture area '#calendarSection' not found.");
        return;
    }

    const isDarkMode = document.body.classList.contains('dark-mode') || 
                      document.documentElement.classList.contains('dark-mode') ||
                      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const themeBgColor = isDarkMode ? '#000000' : '#ffffff';

    if (prevBtn) prevBtn.style.visibility = 'hidden';
    if (nextBtn) nextBtn.style.visibility = 'hidden';
    if (delBtn) delBtn.style.visibility = 'hidden';
    if (addBtn) addBtn.style.visibility = 'hidden';
    if (ssBtn) ssBtn.style.visibility = 'hidden';

    const originalBg = captureArea.style.backgroundColor;
    captureArea.style.backgroundColor = themeBgColor;

    try {
        const dpr = window.devicePixelRatio || 1;
        const targetScale = Math.max(dpr * 2, 4);

        const canvas = await html2canvas(captureArea, {
            useCORS: true,
            allowTaint: true,
            backgroundColor: themeBgColor,
            scale: targetScale,
            imageTimeout: 0,
            logging: false,
            onclone: (clonedDoc) => {
                const clonedArea = clonedDoc.getElementById('calendarSection');
                if (!clonedArea) return;

                const originalCells = captureArea.querySelectorAll('.day-cell');
                const clonedCells = clonedArea.querySelectorAll('.day-cell');

                originalCells.forEach((origCell, index) => {
                    const clonedCell = clonedCells[index];
                    if (!clonedCell) return;

                    const computedStyle = window.getComputedStyle(origCell);
                    clonedCell.style.backgroundImage = computedStyle.backgroundImage;
                    clonedCell.style.backgroundSize = computedStyle.backgroundSize;
                    clonedCell.style.backgroundPosition = computedStyle.backgroundPosition;
                    clonedCell.style.backgroundRepeat = computedStyle.backgroundRepeat;
                    clonedCell.style.backgroundColor = computedStyle.backgroundColor;
                    
                    clonedCell.style.overflow = 'hidden';
                });
            }
        });

        const year = dateState.year || new Date().getFullYear();
        const month = dateState.month !== undefined 
            ? String(dateState.month + 1).padStart(2, '0') 
            : String(new Date().getMonth() + 1).padStart(2, '0');
        const fileName = `calendar-${year}-${month}.png`;

        canvas.toBlob(async (blob) => {
            if (!blob) {
                console.error("Failed to generate image blob.");
                return;
            }

            const file = new File([blob], fileName, { type: 'image/png' });

            // Native Mobile Share / Save to Album
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: 'Calendar Screenshot',
                        text: `Calendar snapshot for ${year}-${month}`
                    });
                } catch (shareError) {
                    if (shareError.name !== 'AbortError') {
                        console.error("Share failed:", shareError);
                    }
                }
            } else {
                // Desktop direct download
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = fileName;
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
            }
        }, 'image/png', 1.0);

    } catch (error) {
        console.error("Screenshot capture failed:", error);
    } finally {
        captureArea.style.backgroundColor = originalBg;
        if (prevBtn) prevBtn.style.visibility = 'visible';
        if (nextBtn) nextBtn.style.visibility = 'visible';
        if (delBtn) delBtn.style.visibility = 'visible';
        if (addBtn) addBtn.style.visibility = 'visible';
        if (ssBtn) ssBtn.style.visibility = 'visible';
    }
}

export async function renderCalendar(year, month) {
    const calendarElement = document.getElementById('calendar');    
    calendarElement.innerHTML = '';
    
    ui.weekdays.forEach(name => {
        const div = document.createElement('div');
        div.className = 'day-name';
        div.innerText = name;
        calendarElement.appendChild(div);
    });

    const firstDayIndex = new Date(year, month, 1).getDay(); 
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDayIndex; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'day-cell empty-cell';
        calendarElement.appendChild(emptyCell);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement('div');
        cell.className = 'day-cell';

        const mm = String(month + 1).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        const dateString = `${year}-${mm}-${dd}`;
        
        cell.id = `cell-${dateString}`;
        cell.innerHTML = `<span>${day}</span>`;
        cell.onclick = async () => {
            const hasPhoto = cell.getAttribute('data-has-photo') === 'true';
            if (hasPhoto) {
                const confirmOverwrite = confirm(ui.confirm_delete);
                if (confirmOverwrite) {
                    const result = await deleteCell(currentTable, dateString);
                    if (result.success) {
                        try {
                            await renderCalendar(dateState.year, dateState.month);
                        } catch (err) {
                            console.log(err);
                        }
                    }
                    return;
                }
            } else {
                const result = await addwDate(currentTable, dateString, session.username);
                if (result.success) {
                    try {
                        await renderCalendar(dateState.year, dateState.month);
                    } catch (err) {
                        console.log(err);
                    }
                }
            }
        };

        calendarElement.appendChild(cell);
    }

    try {
        const response = await calendarService(currentTable, month + 1, year);
        
        if (response.success && Array.isArray(response.data)) {
            response.data.forEach(entry => {
                populateCell(entry.date, entry.imageUrl);
            });
        }
    } catch (error) {
        console.error("Failed to fetch calendar entries:", error);
    }
}

export function populateCell(dateString, imageUrl) {    
    const targetCell = document.getElementById(`cell-${dateString}`);
    if (!targetCell) return;

    const dateSpan = targetCell.querySelector('span');
    const isDark = document.body.classList.contains('dark-mode');

    if (imageUrl) {
        targetCell.setAttribute('data-has-photo', 'true');
        if (dateSpan) dateSpan.style.display = 'none';
        targetCell.style.backgroundColor = isDark ? '#000000' : '#ffffff';
        targetCell.style.backgroundImage = (imageUrl === "none") ? 'none' : `url(${imageUrl})`;
    } else {
        targetCell.removeAttribute('data-has-photo');
        if (dateSpan) dateSpan.style.display = 'block';
        targetCell.style.backgroundImage = 'none';
        targetCell.style.backgroundColor = '';
    }
}

const handleRefresh = async () => {
    await updateDate(monthLabel, yearLabel, dateState, currentDisplayDate);
    await renderCalendar(dateState.year, dateState.month);
    populateOptions('monthOptions', 0, 11, true, dateState, currentDisplayDate, handleRefresh);
    populateOptions('yearOptions', 2020, 2030, false, dateState, currentDisplayDate, handleRefresh);
};