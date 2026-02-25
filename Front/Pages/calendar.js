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
        
        try {
            setPageDisabled(true);
            const result = await addwDate(currentTable, today, session.username);
            if (result.success) {
                await renderCalendar(dateState.year, dateState.month);
            }
        } catch (err) {
            console.log(err);
        } finally {
            setPageDisabled(false); 
        }
    };

    await updateDate(monthLabel, yearLabel, dateState, currentDisplayDate);
    await renderCalendar(dateState.year, dateState.month);

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
                    try {
                        setPageDisabled(true);
                        const result = await deleteCell(currentTable, dateString);
                        if (result.success) {
                            await renderCalendar(dateState.year, dateState.month);
                        }
                    } catch (err) {
                        console.log(err);
                    } finally {
                        setPageDisabled(false); 
                    }
                    return;
                }
            } else {
                try {
                    setPageDisabled(true);
                    const result = await addwDate(currentTable, dateString, session.username);
                    if (result.success) {
                        await renderCalendar(dateState.year, dateState.month);
                    }
                } catch (err) {
                    console.log(err);
                } finally {
                    setPageDisabled(false); 
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