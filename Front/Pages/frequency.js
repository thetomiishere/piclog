import { ui } from './dictionary.js';
import { addwDate, editTableName } from '../Modals/frequencyModal.js';
import { populateOptions, updateDate, setPageDisabled } from './trivia.js';
import { frequencyService, getTableMetadata, deleteFreq, updateTableName } from '../Services/frequencyService.js';

const session = JSON.parse(localStorage.getItem("currentUser"));
let currentTable = "";
let currentDisplayDate = new Date();
let dateState = {
    year: currentDisplayDate.getFullYear(),
    month: currentDisplayDate.getMonth()
};

export async function frequency(freqID) {
    currentTable = freqID;
    const titleDisplay = document.getElementById('currentPageTitle');
    if (titleDisplay) {
        titleDisplay.style.cursor = 'pointer';
        
        titleDisplay.onclick = async () => {
            const currentName = titleDisplay.textContent;
            const newName = await editTableName(currentName);
            
            if (newName && newName !== currentName) {
                const res = await updateTableName('frequencies', freqID, newName, session.username);
                if (res.success) {
                    alert(ui.name_updated);
                    location.reload();
                }
            }
        };
    }

    const monthLabel = document.getElementById('monthLabelFreq'); 
    const yearLabel = document.getElementById('yearLabelFreq');
    const prevBtn = document.getElementById('prevMonthFreq');
    const nextBtn = document.getElementById('nextMonthFreq');
    const openBtn = document.getElementById('openFreqModal');

    populateOptions('monthOptionsFreq', 0, 11, true, dateState, currentDisplayDate, handleRefresh);
    populateOptions('yearOptionsFreq', 2020, 2030, false, dateState, currentDisplayDate, handleRefresh);

    monthLabel.onclick = (e) => {
        e.stopPropagation();
        document.getElementById('monthOptionsFreq').classList.toggle('active');
        document.getElementById('yearOptionsFreq').classList.remove('active');
    };

    yearLabel.onclick = (e) => {
        e.stopPropagation();
        document.getElementById('yearOptionsFreq').classList.toggle('active');
        document.getElementById('monthOptionsFreq').classList.remove('active');
    };

    window.onclick = () => {
        document.getElementById('monthOptionsFreq').classList.remove('active');
        document.getElementById('yearOptionsFreq').classList.remove('active');
    };

    prevBtn.onclick = async () => {
        currentDisplayDate.setMonth(currentDisplayDate.getMonth() - 1);
        await updateDate(monthLabel, yearLabel, dateState, currentDisplayDate);
        await renderFreq(dateState.year, dateState.month);
    };

    nextBtn.onclick = async () => {
        currentDisplayDate.setMonth(currentDisplayDate.getMonth() + 1);
        await updateDate(monthLabel, yearLabel, dateState, currentDisplayDate);
        await renderFreq(dateState.year, dateState.month);
    };

    openBtn.onclick = async () => {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        try {
            setPageDisabled(true);
            const result = await addwDate(currentTable, today, session.username);
            if (result.success) {
                await renderFreq(dateState.year, dateState.month);
            }
        } catch(err){
            console.log(err);
        } finally {
            setPageDisabled(false);
        }
    };

    await updateDate(monthLabel, yearLabel, dateState, currentDisplayDate);
    await renderFreq(dateState.year, dateState.month);
}

export async function renderFreq(year, month) {
    const grid = document.getElementById('frequencyGrid');
    if (!grid) return;
    grid.innerHTML = '';
    ui.weekdays.forEach(name => {
        const div = document.createElement('div');
        div.className = 'day-name';
        div.innerText = name;
        grid.appendChild(div);
    });

    const response = await frequencyService(currentTable, year, month + 1);
    const data = response.data || {};

    const tableMetadata = await getTableMetadata(currentTable); 
    const themeColor = tableMetadata?.color || "#969696";
    
    const values = Object.values(data).map(d => Number(d.count || 0));
    const maxVal = values.length > 0 ? Math.max(...values) : 10;
    const minVal = values.length > 0 ? Math.min(...values) : 0;
    const range = maxVal - minVal;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'day-cell empty-cell';
        grid.appendChild(emptyCell);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement('div');
        cell.className = 'day-cell';

        const mm = String(month + 1).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        const dateString = `${year}-${mm}-${dd}`;
        cell.id = `cell-${dateString}`;
        cell.innerHTML = `<span>${day}</span>`;

        if (data && data[dateString]) {
            cell.setAttribute('data-has-data', 'true');
            const currentVal = Number(data[dateString].count || 0);
            let scale = 1;
            if (range > 0) {
                scale = ((currentVal - minVal) / range) * 9 + 1;
            } else if (currentVal > 0) {
                scale = 10;
            }
            applyIntensityStyle(cell, scale, themeColor);
        }

        cell.onclick = async () => {
            const hasData = cell.getAttribute('data-has-data') === 'true';
            if (hasData) {
                const confirmOverwrite = confirm(ui.confirm_delete);
                if (confirmOverwrite) {
                    try {
                        setPageDisabled(true);
                        const result = await deleteFreq(currentTable, dateString);
                        if (result.success) {
                            await renderFreq(dateState.year, dateState.month);
                        }
                    } catch(err){
                        console.log(err);
                    } finally {
                        setPageDisabled(false);
                    }
                }
            } else {
                try {
                    setPageDisabled(true);
                    const result = await addwDate(currentTable, dateString, session.username);
                    if (result.success) {
                        await renderFreq(dateState.year, dateState.month);
                    }
                } catch(err){
                    console.log(err);
                } finally {
                    setPageDisabled(false);
                }
            }
        };
        grid.appendChild(cell);
    }
}

function hexToHSL(hex) {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;

    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; 
    } else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
}

function applyIntensityStyle(cell, scale, hexColor) {
    const isDarkMode = document.body.classList.contains('dark-mode');
    const hsl = hexToHSL(hexColor);
    
    let lightness;
    if (isDarkMode) {
        lightness = 60 - (scale / 10) * 45; 
    } else {
        lightness = 95 - (scale / 10) * 65;
    }

    cell.style.backgroundColor = `hsl(${hsl.h}, ${hsl.s}%, ${lightness}%)`;
    cell.style.border = `1px solid hsla(${hsl.h}, ${hsl.s}%, ${lightness}%, 0.5)`;
    
    if (isDarkMode) {
        cell.style.color = lightness > 40 ? "#000" : "#fff";
    } else {
        cell.style.color = lightness < 50 ? "#fff" : "var(--text-main)";
    }
}

const handleRefresh = async () => {
    const monthLabel = document.getElementById('monthLabelFreq'); 
    const yearLabel = document.getElementById('yearLabelFreq');
    await updateDate(monthLabel, yearLabel, dateState, currentDisplayDate);
    await renderCalendar(dateState.year, dateState.month);
    populateOptions('monthOptions', 0, 11, true, dateState, currentDisplayDate, handleRefresh);
    populateOptions('yearOptions', 2020, 2030, false, dateState, currentDisplayDate, handleRefresh);
};