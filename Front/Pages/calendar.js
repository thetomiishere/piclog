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
        screenshotBtn.onclick = () => htmlToCanvas('calendarSection');
    }

}

async function htmlToCanvas(id) {
    const captureArea = document.getElementById(id);
    if (!captureArea) return;

    const prevBtn = document.getElementById('prevMonth');
    const nextBtn = document.getElementById('nextMonth');
    const delBtn = document.getElementById('deleteCalendarBtn');
    const addBtn = document.getElementById('openModal');
    const ssBtn = document.getElementById('screenshotBtn');

    if (prevBtn) prevBtn.style.visibility = 'hidden';
    if (nextBtn) nextBtn.style.visibility = 'hidden';
    if (delBtn) delBtn.style.visibility = 'hidden';
    if (addBtn) addBtn.style.visibility = 'hidden';
    if (ssBtn) ssBtn.style.visibility = 'hidden';

    const isDarkMode = document.body.classList.contains('dark-mode') || 
                      document.documentElement.classList.contains('dark-mode');
    const themeBgColor = isDarkMode ? '#000000' : '#ffffff';
    const originalBg = captureArea.style.backgroundColor;
    captureArea.style.backgroundColor = themeBgColor;

    try {
        const cellImages = captureArea.querySelectorAll('.cell-image');
        await Promise.all(Array.from(cellImages).map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => { img.onload = img.onerror = resolve; });
        }));

        const canvas = await html2canvas(captureArea, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: themeBgColor,
            onclone: (clonedDoc) => {
                const clonedImages = clonedDoc.querySelectorAll('.cell-image');
                clonedImages.forEach(img => {
                    const width = img.naturalWidth;
                    const height = img.naturalHeight;
                    if (width && height) {
                        const imgRatio = width / height;
                        if (imgRatio > 1.2) {
                            img.style.objectFit = 'contain';
                            img.style.width = '100%';
                            img.style.height = 'auto';
                            img.style.top = '50%';
                            img.style.transform = 'translateY(-50%)';
                        }
                    }
                });
            }
        });

        const year = dateState.year || new Date().getFullYear();
        const month = String((dateState.month ?? new Date().getMonth()) + 1).padStart(2, '0');
        const fileName = `calendar-${year}-${month}`;

        saveCanvasImage(canvas, fileName);
    } catch (err) {
        console.error("Screenshot capture failed:", err);
    } finally {
        captureArea.style.backgroundColor = originalBg;
        if (prevBtn) prevBtn.style.visibility = 'visible';
        if (nextBtn) nextBtn.style.visibility = 'visible';
        if (delBtn) delBtn.style.visibility = 'visible';
        if (addBtn) addBtn.style.visibility = 'visible';
        if (ssBtn) ssBtn.style.visibility = 'visible';
    }
}

function saveCanvasImage(canvas, filename) {
    canvas.toBlob(async (blob) => {
        if (!blob) {
            console.error("Failed to export canvas image.");
            return;
        }
        const file = new File([blob], `${filename}.png`, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({
                    files: [file],
                    title: 'Calendar Export',
                    text: `Calendar snapshot for ${filename}`
                });
            } catch (err) {
                if (err.name !== 'AbortError') console.error(err);
            }
        } else {
            const link = document.createElement('a');
            link.download = `${filename}.png`;
            link.href = URL.createObjectURL(blob);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        }
    }, 'image/png', 1.0);
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

// export function populateCell(dateString, imageUrl) {    
//     const targetCell = document.getElementById(`cell-${dateString}`);
//     if (!targetCell) return;

//     const dateSpan = targetCell.querySelector('span');
//     const isDark = document.body.classList.contains('dark-mode');

//     if (imageUrl) {
//         targetCell.setAttribute('data-has-photo', 'true');
//         if (dateSpan) dateSpan.style.display = 'none';
//         targetCell.style.backgroundColor = isDark ? '#000000' : '#ffffff';
//         targetCell.style.backgroundImage = (imageUrl === "none") ? 'none' : `url(${imageUrl})`;
//     } else {
//         targetCell.removeAttribute('data-has-photo');
//         if (dateSpan) dateSpan.style.display = 'block';
//         targetCell.style.backgroundImage = 'none';
//         targetCell.style.backgroundColor = '';
//     }
// }
export function populateCell(dateString, imageUrl) {    
    const targetCell = document.getElementById(`cell-${dateString}`);
    if (!targetCell) return;

    const dateSpan = targetCell.querySelector('span');
    const isDark = document.body.classList.contains('dark-mode');
    const themeBgColor = isDark ? '#000000' : '#ffffff';

    const existingImg = targetCell.querySelector('.cell-image');
    if (existingImg) existingImg.remove();

    targetCell.style.backgroundColor = themeBgColor;
    if (imageUrl && imageUrl !== "none") {
        targetCell.setAttribute('data-has-photo', 'true');
        if (dateSpan) dateSpan.style.display = 'none';
        
        targetCell.style.position = 'relative';
        targetCell.style.overflow = 'hidden';
        targetCell.style.backgroundImage = 'none';

        const img = document.createElement('img');
        img.src = imageUrl;
        img.className = 'cell-image';
        img.crossOrigin = 'anonymous';
        
        img.style.position = 'absolute';
        img.style.top = '0';
        img.style.left = '0';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.zIndex = '1';

        const adjust3to4Scaling = () => {
            const width = img.naturalWidth;
            const height = img.naturalHeight;

            if (width && height) {
                const imgRatio = width / height;
                const targetRatio = 3 / 4; // 0.75

                if (imgRatio > targetRatio) {
                    img.style.objectFit = 'contain';
                    img.style.objectPosition = 'center center';
                } else {
                    img.style.objectFit = 'cover';
                    img.style.objectPosition = 'center center';
                }
            }
        };

        if (img.complete && img.naturalWidth) {
            adjust3to4Scaling();
        } else {
            img.onload = adjust3to4Scaling;
        }

        if (dateSpan) dateSpan.style.zIndex = '2';

        targetCell.appendChild(img);
    } else {
        targetCell.removeAttribute('data-has-photo');
        if (dateSpan) dateSpan.style.display = 'none';
        targetCell.style.backgroundImage = 'none';
    }
}

const handleRefresh = async () => {
    await updateDate(monthLabel, yearLabel, dateState, currentDisplayDate);
    await renderCalendar(dateState.year, dateState.month);
    populateOptions('monthOptions', 0, 11, true, dateState, currentDisplayDate, handleRefresh);
    populateOptions('yearOptions', 2020, 2030, false, dateState, currentDisplayDate, handleRefresh);
};