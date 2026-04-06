// ==========================================
// 1. Mobile Sidebar & UI Toggle
// ==========================================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

// ==========================================
// 2. Theme Management
// ==========================================
let currentTheme = localStorage.getItem('theme') || 'system';
const themeBtn = document.getElementById('theme-btn');
const themeIcon = themeBtn.querySelector('i');

function applyTheme(theme) {
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeIcon.className = theme === 'system' ? 'ph ph-desktop' : 'ph ph-moon';
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        themeIcon.className = theme === 'system' ? 'ph ph-desktop' : 'ph ph-sun';
    }
    localStorage.setItem('theme', theme);
}
function cycleTheme() { 
    currentTheme = currentTheme === 'system' ? 'dark' : currentTheme === 'dark' ? 'light' : 'system'; 
    applyTheme(currentTheme); 
}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if(currentTheme === 'system') applyTheme('system');
});
applyTheme(currentTheme);

// ==========================================
// 3. Multi-Database Server Engine
// ==========================================
let serverEnv = JSON.parse(localStorage.getItem('myServerEnv')) || { 'MASTER': { tables: {} } };
let currentDB = localStorage.getItem('currentActiveDB') || 'MASTER';

if (!serverEnv[currentDB]) currentDB = Object.keys(serverEnv)[0] || 'MASTER';

function saveDatabase() {
    localStorage.setItem('myServerEnv', JSON.stringify(serverEnv));
    localStorage.setItem('currentActiveDB', currentDB);
    updateSidebar();
    if(document.getElementById('tab-diagram').classList.contains('active')) renderDiagram();
}

function resetDatabase() {
    if(confirm("Are you sure you want to drop ALL databases and reset the server?")) {
        serverEnv = { 'MASTER': { tables: {} } };
        currentDB = 'MASTER';
        saveDatabase();
        clearEditor();
        logMessage("Server reset completely.");
        switchTab('messages');
        tableContainer.innerHTML = '';
        diagramContainer.innerHTML = '';
    }
}

function setContextDB(dbName) {
    if(serverEnv[dbName]) {
        currentDB = dbName;
        saveDatabase();
        logMessage(`Changed database context to '${dbName}'.`);
        // Auto-close sidebar on mobile after selection
        if(window.innerWidth <= 850) toggleSidebar(); 
    }
}

// ==========================================
// 4. UI and Tab Management
// ==========================================
const sqlInput = document.getElementById('sql-input');
const outputConsole = document.getElementById('output-console');
const tableContainer = document.getElementById('output-table-container');
const diagramContainer = document.getElementById('diagram-container');

function switchTab(tab) {
    document.querySelectorAll('.results-tabs .tab').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
    
    outputConsole.style.display = tab === 'messages' ? 'block' : 'none';
    tableContainer.style.display = tab === 'results' ? 'block' : 'none';
    diagramContainer.style.display = tab === 'diagram' ? 'block' : 'none';

    if(tab === 'diagram') renderDiagram();
}

function clearEditor() { sqlInput.value = ''; sqlInput.focus(); closeAllLists(); }

function logMessage(msg, isError = false) {
    outputConsole.textContent = msg;
    outputConsole.style.color = isError ? 'var(--danger-color)' : 'var(--text-primary)';
    switchTab('messages');
}

function updateSidebar() {
    const dbList = document.getElementById('database-list');
    dbList.innerHTML = '';
    
    for (const dbName in serverEnv) {
        const isActive = dbName === currentDB ? 'active-db' : '';
        const tables = serverEnv[dbName].tables;
        
        let html = `
            <li>
                <details ${isActive ? 'open' : ''}>
                    <summary class="${isActive}" onclick="setContextDB('${dbName}')">
                        <i class="ph-fill ph-database"></i> ${dbName}
                    </summary>
                    <ul>
        `;
        
        if(Object.keys(tables).length === 0) {
            html += `<li style="opacity: 0.5; font-size: 0.8rem; margin-left: 20px;">No tables</li>`;
        } else {
            for(const tName in tables) {
                html += `<li><i class="ph ph-table"></i> dbo.${tName}</li>`;
            }
        }
        html += `</ul></details></li>`;
        dbList.innerHTML += html;
    }
}
updateSidebar(); 

// ==========================================
// 5. SQL Execution Parser
// ==========================================
function executeSQL() {
    const queries = sqlInput.value.replace(/\n/g, ' ').split(';').map(q => q.trim()).filter(q => q.length > 0);
    if(queries.length === 0) return logMessage("Please enter a command.", true);

    let rowsAffected = 0;
    
    for (let query of queries) {
        try {
            let match = query.match(/^USE\s+(\w+)/i);
            if (match) {
                const dbName = match[1].toUpperCase();
                if(serverEnv[dbName]) { currentDB = dbName; rowsAffected++; continue; } 
                else throw `Database '${dbName}' does not exist.`;
            }

            match = query.match(/^CREATE\s+DATABASE\s+(\w+)/i);
            if (match) {
                const dbName = match[1].toUpperCase();
                if(serverEnv[dbName]) throw `Database '${dbName}' already exists.`;
                serverEnv[dbName] = { tables: {} };
                rowsAffected++; continue;
            }

            match = query.match(/^DROP\s+DATABASE\s+(\w+)/i);
            if (match) {
                const dbName = match[1].toUpperCase();
                if(!serverEnv[dbName]) throw `Database '${dbName}' does not exist.`;
                if(dbName === 'MASTER') throw `Cannot drop the MASTER database.`;
                delete serverEnv[dbName];
                if(currentDB === dbName) currentDB = 'MASTER'; 
                rowsAffected++; continue;
            }

            const activeTables = serverEnv[currentDB].tables;

            match = query.match(/^SELECT\s+(.+)\s+FROM\s+(\w+)/i);
            if (match) {
                renderTable(match[2].toUpperCase(), activeTables);
                return; 
            }

            match = query.match(/^CREATE\s+TABLE\s+(\w+)\s*\((.+)\)/i);
            if (match) {
                const tName = match[1].toUpperCase();
                const rawCols = match[2].split(',');
                const cols = [], types = [];
                rawCols.forEach(c => {
                    const parts = c.trim().split(/\s+/);
                    cols.push(parts[0].toUpperCase());
                    types.push(parts[1] ? parts[1].toUpperCase() : 'VARCHAR');
                });
                activeTables[tName] = { columns: cols, types: types, rows: [] };
                rowsAffected++; continue;
            }

            match = query.match(/^DROP\s+TABLE\s+(\w+)/i);
            if (match) {
                const tName = match[1].toUpperCase();
                if(!activeTables[tName]) throw `Table '${tName}' does not exist in '${currentDB}'.`;
                delete activeTables[tName];
                rowsAffected++; continue;
            }

            match = query.match(/^INSERT\s+INTO\s+(\w+)\s+VALUES\s*\((.+)\)/i);
            if (match) {
                const tName = match[1].toUpperCase();
                if(!activeTables[tName]) throw `Table '${tName}' does not exist in '${currentDB}'.`;
                
                const valString = match[2];
                let vals = [], currentVal = '', inQuotes = false;
                for(let i=0; i<valString.length; i++) {
                    const char = valString[i];
                    if(char === "'" || char === '"') inQuotes = !inQuotes;
                    else if(char === ',' && !inQuotes) { vals.push(currentVal.trim()); currentVal = ''; }
                    else currentVal += char;
                }
                vals.push(currentVal.trim());

                let newRow = {};
                activeTables[tName].columns.forEach((col, i) => newRow[col] = vals[i] || null);
                activeTables[tName].rows.push(newRow);
                rowsAffected++; continue;
            }
            throw "Syntax error or command not supported.";
        } catch (error) {
            saveDatabase(); 
            return logMessage("Error: " + error, true);
        }
    }
    saveDatabase();
    logMessage(`Command(s) completed successfully.\n(${rowsAffected} operation(s) executed)`);
}

function renderTable(tableName, activeTables) {
    const tableData = activeTables[tableName];
    if (!tableData) return logMessage(`Invalid object name '${tableName}' in '${currentDB}'.`, true);

    if (tableData.rows.length === 0) {
        tableContainer.innerHTML = '<div style="padding: 20px; color: var(--text-secondary);">Table is empty.</div>';
    } else {
        let html = '<table><thead><tr>';
        tableData.columns.forEach(col => html += `<th>${col}</th>`);
        html += '</tr></thead><tbody>';
        tableData.rows.forEach(row => {
            html += '<tr>';
            tableData.columns.forEach(col => html += `<td>${row[col] !== null ? row[col] : 'NULL'}</td>`);
            html += '</tr>';
        });
        html += '</tbody></table>';
        tableContainer.innerHTML = html;
    }
    switchTab('results');
}

// ==========================================
// 6. Interactive Diagram (With Mobile Touch!)
// ==========================================
function renderDiagram() {
    diagramContainer.innerHTML = '';
    const activeTables = serverEnv[currentDB].tables;
    
    if(Object.keys(activeTables).length === 0) {
        diagramContainer.innerHTML = `<div style="padding: 20px; color: var(--text-secondary);">No tables in '${currentDB}'.</div>`;
        return;
    }

    let offsetX = 20, offsetY = 20;

    for (const tableName in activeTables) {
        const table = activeTables[tableName];
        const card = document.createElement('div');
        card.className = 'schema-card';
        card.style.left = offsetX + 'px';
        card.style.top = offsetY + 'px';

        let html = `<div class="schema-card-header"><i class="ph-fill ph-table"></i> ${tableName}</div>`;

        table.columns.forEach((col, i) => {
            const isKey = i === 0 || col.includes('ID');
            const keyIcon = isKey ? `<i class="ph-fill ph-key" style="color: var(--key-color);"></i>` : '';
            html += `<div class="schema-card-row"><span class="col-name">${keyIcon} ${col}</span><span class="col-type">${table.types[i]}</span></div>`;
        });

        card.innerHTML = html;
        diagramContainer.appendChild(card);
        makeDraggable(card);

        offsetX += 240;
        if (offsetX > diagramContainer.clientWidth - 250) { offsetX = 20; offsetY += 200; }
    }
}

function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const header = element.querySelector('.schema-card-header');
    
    // Support Desktop Mouse
    header.onmousedown = dragMouseDown;
    // Support Mobile Touch
    header.addEventListener('touchstart', dragTouchStart, {passive: false});

    function dragMouseDown(e) {
        e.preventDefault();
        pos3 = e.clientX; pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function dragTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        pos3 = touch.clientX; pos4 = touch.clientY;
        document.ontouchend = closeDragElement;
        document.ontouchmove = elementTouchDrag;
    }

    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY;
        pos3 = e.clientX; pos4 = e.clientY;
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
    }

    function elementTouchDrag(e) {
        const touch = e.touches[0];
        pos1 = pos3 - touch.clientX; pos2 = pos4 - touch.clientY;
        pos3 = touch.clientX; pos4 = touch.clientY;
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null; document.onmousemove = null;
        document.ontouchend = null; document.ontouchmove = null;
    }
}

// ==========================================
// 7. SQL Autocomplete Engine
// ==========================================
const sqlKeywords = [
    'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 
    'UPDATE', 'SET', 'DELETE', 'CREATE', 'DATABASE', 'TABLE', 'DROP', 
    'USE', 'ALTER', 'ADD', 'CONSTRAINT', 'PRIMARY KEY', 'FOREIGN KEY', 
    'UNIQUE', 'INT', 'VARCHAR', 'DATETIME', 'AND', 'OR', 'NOT'
];

const autocompleteList = document.getElementById('autocomplete-list');
let currentFocus = -1;

function getSuggestions(currentWord) {
    let suggestions = [];
    const wordUpper = currentWord.toUpperCase();

    sqlKeywords.forEach(kw => {
        if (kw.startsWith(wordUpper)) suggestions.push({ text: kw, type: 'Keyword' });
    });

    for(const dbName in serverEnv) {
        if (dbName.toUpperCase().startsWith(wordUpper)) suggestions.push({ text: dbName, type: 'Database' });
    }

    const activeTables = serverEnv[currentDB].tables;
    for (const tableName in activeTables) {
        if (tableName.toUpperCase().startsWith(wordUpper)) suggestions.push({ text: tableName, type: 'Table' });
        activeTables[tableName].columns.forEach(col => {
            if (col.toUpperCase().startsWith(wordUpper)) {
                if (!suggestions.find(s => s.text === col && s.type === 'Column')) {
                    suggestions.push({ text: col, type: 'Column' });
                }
            }
        });
    }
    return suggestions;
}

sqlInput.addEventListener('input', function(e) {
    closeAllLists();
    const val = this.value;
    if (!val) return;

    const cursorPos = this.selectionStart;
    const textBeforeCursor = val.substring(0, cursorPos);
    const words = textBeforeCursor.split(/[\s,()]+/);
    const currentWord = words[words.length - 1];

    if (currentWord.length < 1) return;

    const suggestions = getSuggestions(currentWord);
    if (suggestions.length === 0) return;

    currentFocus = -1;
    autocompleteList.style.display = 'block';

    const lines = textBeforeCursor.split('\n');
    const currentLine = lines.length;
    const charsInLine = lines[lines.length - 1].length;
    
    // Adjusted slightly for mobile view padding
    autocompleteList.style.top = (currentLine * 24 + 40) + 'px';
    autocompleteList.style.left = (charsInLine * 9 + 20) + 'px';

    suggestions.forEach(item => {
        const li = document.createElement('li');
        const matchSpan = `<strong>${item.text.substring(0, currentWord.length)}</strong>`;
        const restSpan = item.text.substring(currentWord.length);
        
        li.innerHTML = `<span>${matchSpan}${restSpan}</span> <span class="type-badge">${item.type}</span>`;
        li.dataset.value = item.text;

        li.addEventListener('click', function() { insertSuggestion(this.dataset.value, currentWord.length); });
        autocompleteList.appendChild(li);
    });
});

sqlInput.addEventListener('keydown', function(e) {
    let items = autocompleteList.getElementsByTagName('li');
    if (autocompleteList.style.display === 'block' && items.length > 0) {
        if (e.key === 'ArrowDown') { e.preventDefault(); currentFocus++; addActive(items); } 
        else if (e.key === 'ArrowUp') { e.preventDefault(); currentFocus--; addActive(items); } 
        else if (e.key === 'Enter') { if (currentFocus > -1) { e.preventDefault(); items[currentFocus].click(); } } 
        else if (e.key === 'Escape') { closeAllLists(); }
    }
});

function insertSuggestion(suggestionText, wordLength) {
    const cursorPos = sqlInput.selectionStart;
    const textBefore = sqlInput.value.substring(0, cursorPos - wordLength);
    const textAfter = sqlInput.value.substring(cursorPos);
    sqlInput.value = textBefore + suggestionText + ' ' + textAfter;
    
    const newCursorPos = textBefore.length + suggestionText.length + 1;
    sqlInput.setSelectionRange(newCursorPos, newCursorPos);
    sqlInput.focus();
    closeAllLists();
}

function addActive(items) {
    if (!items) return;
    removeActive(items);
    if (currentFocus >= items.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = (items.length - 1);
    items[currentFocus].classList.add('active');
    items[currentFocus].scrollIntoView({ block: 'nearest' });
}

function removeActive(items) {
    for (let i = 0; i < items.length; i++) items[i].classList.remove('active');
}

function closeAllLists() { autocompleteList.style.display = 'none'; autocompleteList.innerHTML = ''; }
document.addEventListener('click', function (e) { if (e.target !== sqlInput) closeAllLists(); });