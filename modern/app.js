document.addEventListener("DOMContentLoaded", () => {
    const bookSelect = document.getElementById("book-select");
    const chapterSelect = document.getElementById("chapter-select");
    const bibleTextContainer = document.getElementById("bible-text");
    const darkModeToggle = document.getElementById("dark-mode-toggle");
    const body = document.body;

    // Search Elements
    const searchToggleBtn = document.getElementById("search-toggle-btn");
    const searchModal = document.getElementById("search-modal");
    const searchCloseBtn = document.getElementById("search-close-btn");
    const searchInput = document.getElementById("search-input");
    const searchSubmitBtn = document.getElementById("search-submit-btn");
    const searchResultsContainer = document.getElementById("search-results-container");
    const decreaseScriptureSizeButton = document.getElementById("scripture-size-decrease");
    const increaseScriptureSizeButton = document.getElementById("scripture-size-increase");

    // Select all Previous and Next buttons (top and bottom)
    const prevBtns = document.querySelectorAll(".prev-btn");
    const nextBtns = document.querySelectorAll(".next-btn");

    let bibleData = [];
    let currentBookIndex = -1;
    let currentChapterIndex = -1;
    const minScriptureSize = 16;
    const maxScriptureSize = 30;
    const scriptureSizeStep = 2;

    // --- Data Extraction Helpers ---
    function getBooks(data) {
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.books)) return data.books;
        return [];
    }

    function getChapters(book) {
        if (!book) return [];
        return Array.isArray(book.chapters) ? book.chapters : [];
    }

    function getVerses(chapterObj) {
        if (!chapterObj) return [];
        if (Array.isArray(chapterObj)) return chapterObj;
        if (Array.isArray(chapterObj.verses)) return chapterObj.verses;
        return [];
    }

    // --- Dark Mode Setup ---
    function applyTheme(isDark) {
        if (isDark) {
            body.classList.add('dark-mode');
            darkModeToggle.textContent = '☀️';
            localStorage.setItem('theme', 'dark');
        } else {
            body.classList.remove('dark-mode');
            darkModeToggle.textContent = '🌙';
            localStorage.setItem('theme', 'light');
        }
    }

    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (savedTheme === null && prefersDark)) {
        applyTheme(true);
    } else {
        applyTheme(false);
    }

    darkModeToggle.addEventListener('click', () => {
        const isDark = body.classList.contains('dark-mode');
        applyTheme(!isDark);
    });
    // --- End Dark Mode Setup ---

    function applyScriptureSize(size) {
        const boundedSize = Math.min(maxScriptureSize, Math.max(minScriptureSize, Number(size)));
        bibleTextContainer.style.setProperty("--scripture-font-size", `${boundedSize}px`);
        decreaseScriptureSizeButton.disabled = boundedSize <= minScriptureSize;
        increaseScriptureSizeButton.disabled = boundedSize >= maxScriptureSize;
        decreaseScriptureSizeButton.title = `Decrease scripture text size (currently ${boundedSize}px)`;
        increaseScriptureSizeButton.title = `Increase scripture text size (currently ${boundedSize}px)`;
        decreaseScriptureSizeButton.setAttribute("aria-label", `Decrease scripture text size (currently ${boundedSize}px)`);
        increaseScriptureSizeButton.setAttribute("aria-label", `Increase scripture text size (currently ${boundedSize}px)`);
        localStorage.setItem("scripture-font-size", boundedSize);
    }

    const savedScriptureSize = Number(localStorage.getItem("scripture-font-size"));
    applyScriptureSize(savedScriptureSize >= minScriptureSize && savedScriptureSize <= maxScriptureSize ? savedScriptureSize : 18);
    decreaseScriptureSizeButton.addEventListener("click", () => {
        const currentSize = Number(localStorage.getItem("scripture-font-size")) || 18;
        applyScriptureSize(currentSize - scriptureSizeStep);
    });
    increaseScriptureSizeButton.addEventListener("click", () => {
        const currentSize = Number(localStorage.getItem("scripture-font-size")) || 18;
        applyScriptureSize(currentSize + scriptureSizeStep);
    });

    // --- Search Modal Toggle ---
    function openSearchModal() {
        searchModal.classList.remove("hidden");
        searchModal.setAttribute("aria-hidden", "false");
        searchInput.focus();
    }

    function closeSearchModal() {
        searchModal.classList.add("hidden");
        searchModal.setAttribute("aria-hidden", "true");
    }

    searchToggleBtn.addEventListener("click", openSearchModal);
    searchCloseBtn.addEventListener("click", closeSearchModal);
    searchModal.addEventListener("click", (e) => {
        if (e.target === searchModal) closeSearchModal();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !searchModal.classList.contains("hidden")) {
            closeSearchModal();
        }
    });
    // --- End Search Modal Toggle ---

    // --- Bible Search Logic ---
    function performSearch() {
        const query = searchInput.value.trim().toLowerCase();
        if (!query) {
            searchResultsContainer.innerHTML = `<p class="search-placeholder">Please enter a word or phrase to search.</p>`;
            return;
        }

        if (bibleData.length === 0) {
            searchResultsContainer.innerHTML = `<p class="search-placeholder">Bible data is still loading. Please wait...</p>`;
            return;
        }

        searchResultsContainer.innerHTML = `<p class="search-placeholder">Searching entire Bible...</p>`;

        let results = [];
        // Removed maxResults cap to search all verses and enable virtualized/windowed rendering

        // Traverse books, chapters, verses
        const books = getBooks(bibleData);
        for (let bIdx = 0; bIdx < books.length; bIdx++) {
            const book = books[bIdx];
            const bookName = book.name || book.book || book.title || `Book ${bIdx + 1}`;
            const chapters = getChapters(book);

            for (let cIdx = 0; cIdx < chapters.length; cIdx++) {
                const chapterData = chapters[cIdx];
                const chapterNum = (typeof chapterData === "object" && chapterData !== null && chapterData.chapter) ? chapterData.chapter : (cIdx + 1);
                const verses = getVerses(chapterData);

                if (Array.isArray(verses)) {
                    for (let vIdx = 0; vIdx < verses.length; vIdx++) {
                        const verse = verses[vIdx];
                        let verseNum = vIdx + 1;
                        let verseText = "";

                        if (typeof verse === "string") {
                            verseText = verse;
                        } else if (typeof verse === "object" && verse !== null) {
                            verseNum = verse.verse || verse.number || verse.verse_num || verse.v || (vIdx + 1);
                            verseText = verse.text || verse.verse_text || verse.content || verse.w || verse.t || "";
                        }

                        if (verseText.toLowerCase().includes(query)) {
                            results.push({
                                bookIndex: bIdx,
                                chapterIndex: cIdx,
                                bookName,
                                chapterNum,
                                verseNum,
                                verseText
                            });
                        }
                    }
                }
            }
        }

        renderSearchResults(results, query);
    }

    function renderSearchResults(results, query) {
        searchResultsContainer.scrollTop = 0;
        if (results.length === 0) {
            searchResultsContainer.innerHTML = "";
            const message = document.createElement("p");
            message.className = "search-placeholder";
            message.textContent = `No results found for "${query}".`;
            searchResultsContainer.appendChild(message);
            return;
        }

        const pageSize = 50;
        let currentPage = 1;
        const totalPages = Math.ceil(results.length / pageSize);

        searchResultsContainer.innerHTML = `
            <div id="search-results-summary" class="search-placeholder">
                <span id="search-result-count"></span>
                <span id="search-pagination-info" aria-live="polite" aria-atomic="true"></span>
            </div>
            <div id="search-results-list"></div>
                <nav id="search-pagination-controls" aria-label="Search result pages">
                <button id="search-previous-page" type="button">Previous</button>
                <button id="search-next-page" type="button">Next</button>
                </nav>
        `;

        const listContainer = searchResultsContainer.querySelector("#search-results-list");
        const count = searchResultsContainer.querySelector("#search-result-count");
        const paginationInfo = searchResultsContainer.querySelector("#search-pagination-info");
        const previousPageButton = searchResultsContainer.querySelector("#search-previous-page");
        const nextPageButton = searchResultsContainer.querySelector("#search-next-page");
        count.textContent = `Found ${results.length} result(s)`;

        function renderPage() {
            const start = (currentPage - 1) * pageSize;
            const end = Math.min(start + pageSize, results.length);
            listContainer.replaceChildren();
            searchResultsContainer.scrollTop = 0;

            results.slice(start, end).forEach(result => {
                const item = document.createElement("button");
                item.type = "button";
                item.className = "search-result-item";
                const reference = document.createElement("span");
                reference.className = "search-result-ref";
                reference.textContent = `${result.bookName} ${result.chapterNum}:${result.verseNum}`;
                const text = document.createElement("span");
                text.className = "search-result-text";
                const verseNumber = document.createElement("sup");
                verseNumber.className = "verse-num";
                verseNumber.textContent = result.verseNum;
                text.append(verseNumber, document.createTextNode(" "));
                appendHighlightedText(text, result.verseText, query);
                item.append(reference, text);

                item.addEventListener("click", () => {
                    currentBookIndex = result.bookIndex;
                    currentChapterIndex = result.chapterIndex;
                    bookSelect.value = result.bookIndex;
                    populateChapterSelect(result.bookIndex);
                    chapterSelect.value = result.chapterIndex;
                    renderChapter(result.bookIndex, result.chapterIndex);
                    closeSearchModal();
                });
                listContainer.appendChild(item);
            });

            paginationInfo.textContent = `Showing ${start + 1}-${end} of ${results.length} (Page ${currentPage} of ${totalPages})`;
            previousPageButton.disabled = currentPage === 1;
            nextPageButton.disabled = currentPage === totalPages;
        }

        previousPageButton.addEventListener("click", () => {
            currentPage--;
            renderPage();
        });
        nextPageButton.addEventListener("click", () => {
            currentPage++;
            renderPage();
        });
        renderPage();
    }

    function appendHighlightedText(container, text, query) {
        const matcher = new RegExp(escapeRegExp(query), "gi");
        let lastIndex = 0;

        for (const match of text.matchAll(matcher)) {
            container.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
            const highlight = document.createElement("span");
            highlight.className = "highlight";
            highlight.textContent = match[0];
            container.appendChild(highlight);
            lastIndex = match.index + match[0].length;
        }

        container.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    searchSubmitBtn.addEventListener("click", performSearch);
    searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            performSearch();
        }
    });
    // --- End Bible Search Logic ---

    // Fetch the BSB JSON data
    fetch("BSB.json")
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            bibleData = getBooks(data);
            populateBookSelect();
            updateNavigationButtons();
        })
        .catch(error => {
            console.error("Error loading BSB.json:", error);
            bibleTextContainer.innerHTML = `<p class="error">Error loading Bible data. Please check console or run via a local web server.</p>`;
        });

    function populateBookSelect() {
        bookSelect.innerHTML = `<option value="">Select Book</option>`;
        
        const books = getBooks(bibleData);
        books.forEach((bookObj, index) => {
            const option = document.createElement("option");
            option.value = index;
            option.textContent = bookObj.name || bookObj.book || bookObj.title || `Book ${index + 1}`;
            bookSelect.appendChild(option);
        });
    }

    function populateChapterSelect(bookIndex) {
        chapterSelect.innerHTML = `<option value="">Select Chapter</option>`;
        chapterSelect.disabled = false;

        const books = getBooks(bibleData);
        const book = books[bookIndex];
        const chapters = getChapters(book);

        chapters.forEach((chapterObj, index) => {
            const option = document.createElement("option");
            option.value = index;
            const chapterNum = (typeof chapterObj === "object" && chapterObj !== null && chapterObj.chapter) ? chapterObj.chapter : (index + 1);
            option.textContent = `Chapter ${chapterNum}`;
            chapterSelect.appendChild(option);
        });
    }

    function renderChapter(bookIndex, chapterIndex) {
        const books = getBooks(bibleData);
        const book = books[bookIndex];
        if (!book) return;

        const chapters = getChapters(book);
        const chapterData = chapters[chapterIndex];
        const bookName = book.name || book.book || book.title || "";
        const chapterNum = (typeof chapterData === "object" && chapterData !== null && chapterData.chapter) ? chapterData.chapter : (chapterIndex + 1);

        let html = `<h2>${bookName} ${chapterNum}</h2>`;

        const verses = getVerses(chapterData);

        if (Array.isArray(verses)) {
            verses.forEach((verse, vIdx) => {
                if (typeof verse === "string") {
                    html += `<p class="verse"><sup class="verse-num">${vIdx + 1}</sup> ${verse}</p>`;
                } else if (typeof verse === "object" && verse !== null) {
                    const num = verse.verse || verse.number || verse.verse_num || verse.v || (vIdx + 1);
                    const text = verse.text || verse.verse_text || verse.content || verse.w || verse.t || "";
                    html += `<p class="verse"><sup class="verse-num">${num}</sup> ${text}</p>`;
                }
            });
        }

        bibleTextContainer.innerHTML = html;
        bibleTextContainer.focus(); // Focus for accessibility
        updateNavigationButtons();

        // Scroll to the top of the page when a new chapter renders
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    function updateNavigationButtons() {
        const books = getBooks(bibleData);
        if (currentBookIndex < 0 || currentChapterIndex < 0 || books.length === 0) {
            prevBtns.forEach(btn => btn.disabled = true);
            nextBtns.forEach(btn => btn.disabled = true);
            return;
        }

        const book = books[currentBookIndex];
        const chapters = getChapters(book);

        const isAtStart = (currentBookIndex === 0 && currentChapterIndex === 0);
        const isAtEnd = (currentBookIndex === books.length - 1 && currentChapterIndex === chapters.length - 1);

        prevBtns.forEach(btn => btn.disabled = isAtStart);
        nextBtns.forEach(btn => btn.disabled = isAtEnd);
    }

    function handlePrevious() {
        if (currentBookIndex < 0 || currentChapterIndex < 0) return;

        const books = getBooks(bibleData);
        if (currentChapterIndex > 0) {
            currentChapterIndex--;
        } else if (currentBookIndex > 0) {
            currentBookIndex--;
            const prevBookChapters = getChapters(books[currentBookIndex]);
            currentChapterIndex = prevBookChapters.length - 1;
            populateChapterSelect(currentBookIndex);
            bookSelect.value = currentBookIndex;
        }
        chapterSelect.value = currentChapterIndex;
        renderChapter(currentBookIndex, currentChapterIndex);
    }

    function handleNext() {
        if (currentBookIndex < 0 || currentChapterIndex < 0) return;

        const books = getBooks(bibleData);
        const currentBookChapters = getChapters(books[currentBookIndex]);
        if (currentChapterIndex < currentBookChapters.length - 1) {
            currentChapterIndex++;
        } else if (currentBookIndex < books.length - 1) {
            currentBookIndex++;
            currentChapterIndex = 0;
            populateChapterSelect(currentBookIndex);
            bookSelect.value = currentBookIndex;
        }
        chapterSelect.value = currentChapterIndex;
        renderChapter(currentBookIndex, currentChapterIndex);
    }

    // Event Listeners
    bookSelect.addEventListener("change", (e) => {
        const val = e.target.value;
        if (val === "") {
            currentBookIndex = -1;
            currentChapterIndex = -1;
            chapterSelect.innerHTML = `<option value="">Select Chapter</option>`;
            chapterSelect.disabled = true;
            bibleTextContainer.innerHTML = `<p class="placeholder">Select a book and chapter to begin reading.</p>`;
            updateNavigationButtons();
            return;
        }

        currentBookIndex = parseInt(val, 10);
        currentChapterIndex = 0;
        populateChapterSelect(currentBookIndex);
        renderChapter(currentBookIndex, currentChapterIndex);
        chapterSelect.value = currentChapterIndex;
    });

    chapterSelect.addEventListener("change", (e) => {
        const val = e.target.value;
        if (val === "") return;

        currentChapterIndex = parseInt(val, 10);
        renderChapter(currentBookIndex, currentChapterIndex);
    });

    prevBtns.forEach(btn => btn.addEventListener("click", handlePrevious));
    nextBtns.forEach(btn => btn.addEventListener("click", handleNext));
});
