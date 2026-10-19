'use strict';

let BIBLE_DATA = [];
let currentBookIdx = 0;
let currentChapterIdx = 0;

// Search index for fast searching
let searchIndex = [];
let currentSearchResults = [];
let currentSearchQuery = '';
let displayedSearchResultCount = 0;
const SEARCH_RESULTS_PAGE_SIZE = 100;
const DEFAULT_SCRIPTURE_TEXT_SIZE = 1.0625;
const MIN_SCRIPTURE_TEXT_SIZE = 0.875;
const MAX_SCRIPTURE_TEXT_SIZE = 1.75;
const SCRIPTURE_TEXT_SIZE_STEP = 0.125;

const bookSelect = document.getElementById('book-select');
const chapterSelect = document.getElementById('chapter-select');
const verseContainer = document.getElementById('verse-container');
const themeToggle = document.getElementById('theme-toggle');
const aboutDialog = document.getElementById('about-dialog');
const aboutOpen = document.getElementById('about-open');
const aboutClose = document.getElementById('about-close');
const privacyDialog = document.getElementById('privacy-dialog');
const privacyOpen = document.getElementById('privacy-open');
const privacyClose = document.getElementById('privacy-close');
const scriptureSizeDecrease = document.getElementById('scripture-size-decrease');
const scriptureSizeIncrease = document.getElementById('scripture-size-increase');
const siteHeader = document.querySelector('.site-header');
const searchInput = document.getElementById('search-input');
const searchClear = document.getElementById('search-clear');
const searchSuggestions = document.getElementById('search-suggestions');
const searchSuggestionsList = document.getElementById('search-suggestions-list');
const searchResults = document.getElementById('search-results');
const searchClose = document.getElementById('search-close');
const searchResultsCount = document.getElementById('search-results-count');
const searchResultsList = document.getElementById('search-results-list');
const searchResultsMore = document.getElementById('search-results-more');

const prevBtns = [
  document.getElementById('prev-btn-top'),
  document.getElementById('prev-btn-bottom')
].filter(Boolean);

const nextBtns = [
  document.getElementById('next-btn-top'),
  document.getElementById('next-btn-bottom')
].filter(Boolean);

async function init() {
  if (!bookSelect || !chapterSelect || !verseContainer) {
    console.error('Required page elements are missing.');
    return;
  }

  setupThemeToggle();
  setupScriptureTextSize();
  setupAboutDialog();
  setupPrivacyDialog();
  setupHeaderScroll();
  setupSearch();

  setLoading(true);

  try {
    const response = await fetch('./KJVPCE.json');

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const rawData = await response.json();
    BIBLE_DATA = normalizeBibleData(rawData);

    if (!BIBLE_DATA.length) {
      throw new Error('No books were found in KJVPCE.json.');
    }

    buildSearchIndex();
    populateBookDropdown();
    setupEventListeners();

    window.addEventListener('hashchange', handleRoute);
    handleRoute();
  } catch (error) {
    console.error('Could not load Bible data:', error);
    verseContainer.textContent =
      `Failed to load KJVPCE.json. ${error.message}`;
    verseContainer.classList.add('error');
  } finally {
    setLoading(false);
  }
}

function setLoading(isLoading) {
  verseContainer.setAttribute('aria-busy', String(isLoading));
}

function setupHeaderScroll() {
  if (!siteHeader) return;

  let previousScrollY = window.scrollY;
  let scrollFrame = 0;

  const updateHeaderVisibility = () => {
    scrollFrame = 0;
    const currentScrollY = window.scrollY;

    if (currentScrollY <= 24) {
      siteHeader.classList.remove('is-hidden');
      previousScrollY = currentScrollY;
      return;
    }

    const scrollDelta = currentScrollY - previousScrollY;
    if (Math.abs(scrollDelta) >= 8) {
      if (!siteHeader.contains(document.activeElement)) {
        siteHeader.classList.toggle('is-hidden', scrollDelta > 0);
      }
      previousScrollY = currentScrollY;
    }
  };

  window.addEventListener('scroll', () => {
    if (!scrollFrame) {
      scrollFrame = window.requestAnimationFrame(updateHeaderVisibility);
    }
  }, { passive: true });

}

function setupThemeToggle() {
  if (!themeToggle) return;

  // Check for a saved theme preference, defaulting to dark mode.
  const savedTheme = localStorage.getItem('theme');
  const initialTheme = savedTheme || 'dark';

  applyTheme(initialTheme);

  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  });

}

function setupAboutDialog() {
  if (!aboutDialog || !aboutOpen || !aboutClose) return;

  aboutOpen.addEventListener('click', () => aboutDialog.showModal());
  aboutClose.addEventListener('click', () => aboutDialog.close());
  aboutDialog.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') aboutDialog.close();
  });
  aboutDialog.addEventListener('click', (event) => {
    if (event.target === aboutDialog) aboutDialog.close();
  });
}

function setupPrivacyDialog() {
  if (!privacyDialog || !privacyOpen || !privacyClose) return;

  privacyOpen.addEventListener('click', (event) => {
    event.preventDefault();
    privacyDialog.showModal();
  });
  privacyClose.addEventListener('click', () => privacyDialog.close());
  privacyDialog.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') privacyDialog.close();
  });
  privacyDialog.addEventListener('click', (event) => {
    if (event.target === privacyDialog) privacyDialog.close();
  });
}

function setupScriptureTextSize() {
  const savedSize = Number(localStorage.getItem('scriptureTextSize'));
  const initialSize = savedSize > 0 ? savedSize : DEFAULT_SCRIPTURE_TEXT_SIZE;
  applyScriptureTextSize(initialSize);

  scriptureSizeDecrease?.addEventListener('click', () => {
    applyScriptureTextSize(currentScriptureTextSize - SCRIPTURE_TEXT_SIZE_STEP);
  });

  scriptureSizeIncrease?.addEventListener('click', () => {
    applyScriptureTextSize(currentScriptureTextSize + SCRIPTURE_TEXT_SIZE_STEP);
  });
}

let currentScriptureTextSize = DEFAULT_SCRIPTURE_TEXT_SIZE;

function applyScriptureTextSize(size) {
  currentScriptureTextSize = Math.min(
    MAX_SCRIPTURE_TEXT_SIZE,
    Math.max(MIN_SCRIPTURE_TEXT_SIZE, size)
  );
  document.documentElement.style.setProperty(
    '--verse-font-size',
    `${currentScriptureTextSize}rem`
  );
  localStorage.setItem('scriptureTextSize', String(currentScriptureTextSize));

  if (scriptureSizeDecrease) {
    scriptureSizeDecrease.disabled = currentScriptureTextSize <= MIN_SCRIPTURE_TEXT_SIZE;
  }
  if (scriptureSizeIncrease) {
    scriptureSizeIncrease.disabled = currentScriptureTextSize >= MAX_SCRIPTURE_TEXT_SIZE;
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  if (themeToggle) {
    themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
}

/* ==========================================================================
   Search Functionality
   ========================================================================== */

function setupSearch() {
  if (!searchInput) return;

  let debounceTimer = null;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();

    if (query !== currentSearchQuery) hideSearchResults();
    
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const currentQuery = searchInput.value.trim();
      if (currentQuery.length >= 2) {
        showSuggestions(currentQuery);
      } else {
        hideSuggestions();
      }
      updateClearButton(currentQuery);
    }, 150);
  });

  searchInput.addEventListener('focus', () => {
    const query = searchInput.value.trim();
    if (query.length >= 2) {
      showSuggestions(query);
    }
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(debounceTimer);
      const query = searchInput.value.trim();
      if (query.length >= 2) {
        performSearch(query);
        hideSuggestions();
        updateClearButton(query);
      }
    } else if (e.key === 'Escape') {
      hideSuggestions();
      searchInput.blur();
    }
  });

  if (searchClear) {
    searchClear.addEventListener('click', () => {
      clearTimeout(debounceTimer);
      searchInput.value = '';
      searchInput.focus();
      updateClearButton('');
      hideSuggestions();
      hideSearchResults();
    });
  }

  if (searchClose) {
    searchClose.addEventListener('click', hideSearchResults);
  }

  if (searchResultsMore) {
    searchResultsMore.addEventListener('click', appendSearchResultsPage);
  }

  // Close suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchSuggestions?.contains(e.target)) {
      hideSuggestions();
    }
  });
}

function updateClearButton(query) {
  if (searchClear) {
    searchClear.hidden = query.length === 0;
  }
}

function buildSearchIndex() {
  searchIndex = [];
  
  BIBLE_DATA.forEach((book, bookIdx) => {
    if (!book.chapters) return;
    
    book.chapters.forEach((chapter, chapterIdx) => {
      if (!chapter) return;
      
      const verses = normalizeVerses(chapter);
      
      verses.forEach((verse, verseIdx) => {
        const { text, number } = getVerseDetails(verse, verseIdx);
        if (!text) return;
        
        searchIndex.push({
          bookIdx,
          bookName: book.name,
          chapterIdx,
          chapterNumber: chapterIdx + 1,
          verseIdx,
          verseNumber: number,
          text: text
        });
      });
    });
  });
  
  console.log(`Search index built with ${searchIndex.length} verses`);
}

function showSuggestions(query) {
  if (!searchSuggestions || !searchSuggestionsList || searchIndex.length === 0) return;
  
  const results = searchVerses(query, 5);
  
  if (results.length === 0) {
    hideSuggestions();
    return;
  }
  
  searchSuggestionsList.innerHTML = '';
  
  results.forEach((result, idx) => {
    const item = document.createElement('div');
    item.className = 'search-suggestion';
    item.setAttribute('role', 'option');
    item.setAttribute('tabindex', '0');
    item.innerHTML = highlightMatch(`${result.bookName} ${result.chapterNumber}:${result.verseNumber} — ${result.text}`, query);
    item.addEventListener('click', () => {
      performSearch(query);
      hideSuggestions();
    });
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        performSearch(query);
        hideSuggestions();
      }
    });
    searchSuggestionsList.appendChild(item);
  });
  
  searchSuggestions.hidden = false;
}

function hideSuggestions() {
  if (searchSuggestions) {
    searchSuggestions.hidden = true;
  }
  if (searchSuggestionsList) {
    searchSuggestionsList.innerHTML = '';
  }
}

function highlightMatch(text, query) {
  if (!query) return text;
  
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  
  return text.replace(regex, '<mark>$1</mark>');
}

function performSearch(query) {
  if (!query || query.length < 2) return;
  
  const results = searchVerses(query);
  displaySearchResults(query, results);
  showSearchResults();
}

function searchVerses(query, limit = null) {
  const lowerQuery = query.toLowerCase();
  const results = [];
  
  for (const entry of searchIndex) {
    if (entry.text.toLowerCase().includes(lowerQuery)) {
      results.push(entry);
      if (limit && results.length >= limit) break;
    }
  }
  
  return results;
}

function displaySearchResults(query, results) {
  if (!searchResultsCount || !searchResultsList) return;
  
  const count = results.length;
  searchResultsCount.innerHTML = `Found <mark>${count}</mark> matching verse${count !== 1 ? 's' : ''} for "<mark>${escapeHtml(query)}</mark>"`;
  
  searchResultsList.innerHTML = '';
  currentSearchResults = results;
  currentSearchQuery = query;
  displayedSearchResultCount = 0;
  
  if (count === 0) {
    const empty = document.createElement('div');
    empty.className = 'search-results-empty';
    empty.textContent = `No results found for "${query}"`;
    searchResultsList.appendChild(empty);
    if (searchResultsMore) searchResultsMore.hidden = true;
    return;
  }

  appendSearchResultsPage();
}

function appendSearchResultsPage() {
  if (!searchResultsList) return;

  const query = currentSearchQuery;

  const nextResultCount = Math.min(
    displayedSearchResultCount + SEARCH_RESULTS_PAGE_SIZE,
    currentSearchResults.length
  );

  for (let index = displayedSearchResultCount; index < nextResultCount; index += 1) {
    const result = currentSearchResults[index];
    const item = document.createElement('div');
    item.className = 'search-result-item';
    item.setAttribute('role', 'listitem');
    item.setAttribute('tabindex', '0');
    item.dataset.bookIdx = result.bookIdx;
    item.dataset.chapterIdx = result.chapterIdx;
    
    // Create context snippet (verse text with surrounding context)
    const snippet = createSnippet(result.text, query);
    
    item.innerHTML = `
      <span class="search-result-reference">${escapeHtml(result.bookName)} ${result.chapterNumber}:${result.verseNumber}</span>
      <span class="search-result-text">${highlightMatch(snippet, query)}</span>
    `;
    
    item.addEventListener('click', () => {
      navigateToSearchResult(result.bookIdx, result.chapterIdx, result.verseIdx, query);
    });
    
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navigateToSearchResult(result.bookIdx, result.chapterIdx, result.verseIdx, query);
      }
    });
    
    searchResultsList.appendChild(item);
  }

  displayedSearchResultCount = nextResultCount;
  if (searchResultsMore) {
    searchResultsMore.hidden = displayedSearchResultCount >= currentSearchResults.length;
    if (!searchResultsMore.hidden) {
      const remaining = currentSearchResults.length - displayedSearchResultCount;
      const nextBatch = Math.min(SEARCH_RESULTS_PAGE_SIZE, remaining);
      searchResultsMore.textContent = `Show ${nextBatch} more results (${displayedSearchResultCount} of ${currentSearchResults.length} shown)`;
    }
  }
}

function createSnippet(text, query, maxLength = 200) {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerQuery);
  
  if (matchIndex === -1) return text.substring(0, maxLength);
  
  const start = Math.max(0, matchIndex - 60);
  const end = Math.min(text.length, matchIndex + query.length + 60);
  
  let snippet = text.substring(start, end);
  
  if (start > 0) snippet = '…' + snippet;
  if (end < text.length) snippet = snippet + '…';
  
  return snippet;
}

function navigateToSearchResult(bookIdx, chapterIdx, verseIdx, query) {
  // Navigate to the chapter
  navigateTo(bookIdx, chapterIdx);
  
  // Hide search results
  hideSearchResults();
  
  // Clear search input
  if (searchInput) {
    searchInput.value = '';
    updateClearButton('');
  }
  
  // Scroll to the specific verse after rendering
  setTimeout(() => {
    highlightVerseInChapter(verseIdx, query);
  }, 100);
}

function highlightVerseInChapter(verseIdx, query) {
  const verses = document.querySelectorAll('.verse');
  const targetVerse = verses[verseIdx];
  
  if (targetVerse) {
    // Scroll to the verse
    targetVerse.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Highlight the search term in the verse
    const verseText = targetVerse.querySelector('.verse-text');
    if (verseText && query) {
      const originalText = verseText.textContent;
      verseText.innerHTML = highlightMatch(originalText, query);
      
      // Remove highlight after a few seconds
      setTimeout(() => {
        verseText.textContent = originalText;
      }, 5000);
    }
  }
}

function showSearchResults() {
  if (searchResults) {
    searchResults.hidden = false;
    searchResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function hideSearchResults() {
  if (searchResults) {
    searchResults.hidden = true;
  }
  currentSearchResults = [];
  currentSearchQuery = '';
  displayedSearchResultCount = 0;
  if (searchResultsCount) searchResultsCount.textContent = '';
  if (searchResultsList) searchResultsList.replaceChildren();
  if (searchResultsMore) searchResultsMore.hidden = true;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function normalizeBibleData(data) {
  let books;

  if (Array.isArray(data)) {
    books = data;
  } else if (data && typeof data === 'object' && Array.isArray(data.books)) {
    books = data.books;
  } else if (data && typeof data === 'object') {
    books = Object.entries(data).map(([name, chapters]) => ({
      name,
      chapters
    }));
  } else {
    return [];
  }

  return books
    .map((book, index) => {
      if (!book || typeof book !== 'object') return null;

      const name = String(book.name || book.title || book.book || `Book ${index + 1}`);
      const chapterData = book.chapters ?? book.verses ?? [];

      return {
        name,
        chapters: normalizeChapters(chapterData)
      };
    })
    .filter(Boolean);
}

function normalizeChapters(chapterData) {
  if (Array.isArray(chapterData)) {
    return chapterData;
  }

  if (!chapterData || typeof chapterData !== 'object') {
    return [];
  }

  return Object.keys(chapterData)
    .filter(key => /^\d+$/.test(key))
    .sort((a, b) => Number(a) - Number(b))
    .map(key => chapterData[key]);
}

function populateBookDropdown() {
  bookSelect.replaceChildren();

  BIBLE_DATA.forEach((book, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = book.name;
    bookSelect.append(option);
  });
}

function setupEventListeners() {
  bookSelect.addEventListener('change', () => {
    const bookIdx = Number.parseInt(bookSelect.value, 10);
    if (Number.isInteger(bookIdx)) navigateTo(bookIdx, 0);
  });

  chapterSelect.addEventListener('change', () => {
    const chapterIdx = Number.parseInt(chapterSelect.value, 10);
    if (Number.isInteger(chapterIdx)) {
      navigateTo(currentBookIdx, chapterIdx);
    }
  });

  prevBtns.forEach(button => button.addEventListener('click', handlePrev));
  nextBtns.forEach(button => button.addEventListener('click', handleNext));
}

function navigateTo(bookIdx, chapterIdx) {
  const book = BIBLE_DATA[bookIdx];

  if (!book || !book.chapters.length) return;

  const safeChapterIdx = Math.min(
    Math.max(chapterIdx, 0),
    book.chapters.length - 1
  );

  // Encode the book name so names containing punctuation or spaces work in URLs.
  const bookSlug = encodeURIComponent(book.name);
  const newHash = `#${bookSlug}-${safeChapterIdx + 1}`;

  if (window.location.hash === newHash) {
    handleRoute();
  } else {
    window.location.hash = newHash;
  }
}

function handleRoute() {
  if (!BIBLE_DATA.length) return;

  const rawHash = window.location.hash.slice(1);

  if (!rawHash) {
    renderView(0, 0);
    return;
  }

  const lastDash = rawHash.lastIndexOf('-');

  if (lastDash < 0) {
    renderView(0, 0);
    return;
  }

  let rawBookName;
  try {
    rawBookName = decodeURIComponent(rawHash.slice(0, lastDash));
  } catch {
    renderView(0, 0);
    return;
  }

  const chapterNumber = Number.parseInt(rawHash.slice(lastDash + 1), 10);
  const bookIdx = BIBLE_DATA.findIndex(
    book => normalizeBookName(book.name) === normalizeBookName(rawBookName)
  );

  if (bookIdx < 0 || !Number.isInteger(chapterNumber) || chapterNumber < 1) {
    renderView(0, 0);
    return;
  }

  renderView(bookIdx, chapterNumber - 1);
}

function normalizeBookName(name) {
  return String(name).toLowerCase().replace(/[\s._-]+/g, '');
}

function renderView(bookIdx, chapterIdx) {
  const book = BIBLE_DATA[bookIdx];

  if (!book || !Array.isArray(book.chapters) || book.chapters.length === 0) {
    currentBookIdx = bookIdx;
    currentChapterIdx = 0;
    chapterSelect.replaceChildren();
    chapterSelect.disabled = true;
    setNavButtonsDisabled(true);
    verseContainer.textContent = book
      ? `No chapter content is available for ${book.name}.`
      : 'The requested book could not be found.';
    return;
  }

  currentBookIdx = bookIdx;
  currentChapterIdx = Math.min(
    Math.max(chapterIdx, 0),
    book.chapters.length - 1
  );

  bookSelect.value = String(currentBookIdx);
  updateChapterDropdown(book.chapters.length, currentChapterIdx);
  updateNavButtons(book.chapters.length);
  renderVerses(
    book.name,
    currentChapterIdx + 1,
    book.chapters[currentChapterIdx]
  );
}

function updateChapterDropdown(totalChapters, selectedChapterIdx) {
  chapterSelect.replaceChildren();

  for (let index = 0; index < totalChapters; index += 1) {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = `Chapter ${index + 1}`;
    chapterSelect.append(option);
  }

  chapterSelect.disabled = totalChapters === 0;
  chapterSelect.value = String(selectedChapterIdx);
}

function updateNavButtons(totalChaptersInBook) {
  const isFirst = currentBookIdx === 0 && currentChapterIdx === 0;
  const isLast =
    currentBookIdx === BIBLE_DATA.length - 1 &&
    currentChapterIdx === totalChaptersInBook - 1;

  prevBtns.forEach(button => {
    button.disabled = isFirst;
  });

  nextBtns.forEach(button => {
    button.disabled = isLast;
  });
}

function setNavButtonsDisabled(disabled) {
  prevBtns.forEach(button => {
    button.disabled = disabled;
  });

  nextBtns.forEach(button => {
    button.disabled = disabled;
  });
}

function handlePrev() {
  if (currentChapterIdx > 0) {
    navigateTo(currentBookIdx, currentChapterIdx - 1);
    return;
  }

  if (currentBookIdx > 0) {
    const previousBookIdx = currentBookIdx - 1;
    const previousBook = BIBLE_DATA[previousBookIdx];

    if (previousBook?.chapters.length) {
      navigateTo(previousBookIdx, previousBook.chapters.length - 1);
    }
  }
}

function handleNext() {
  const currentBook = BIBLE_DATA[currentBookIdx];
  if (!currentBook) return;

  if (currentChapterIdx < currentBook.chapters.length - 1) {
    navigateTo(currentBookIdx, currentChapterIdx + 1);
    return;
  }

  for (let nextBookIdx = currentBookIdx + 1; nextBookIdx < BIBLE_DATA.length; nextBookIdx += 1) {
    if (BIBLE_DATA[nextBookIdx].chapters.length) {
      navigateTo(nextBookIdx, 0);
      return;
    }
  }
}

function renderVerses(bookName, chapterNumber, rawVerses) {
  const verses = normalizeVerses(rawVerses);

  if (!verses.length) {
    verseContainer.textContent = `No verses found in ${bookName}, chapter ${chapterNumber}.`;
    return;
  }

  const heading = document.createElement('h2');
  heading.textContent = `${bookName} ${chapterNumber}`;

  const verseList = document.createElement('div');
  verseList.className = 'verses';

  verses.forEach((verse, index) => {
    const { text, number } = getVerseDetails(verse, index);

    const paragraph = document.createElement('p');
    paragraph.className = 'verse';

    const verseNumber = document.createElement('sup');
    verseNumber.className = 'verse-num';
    verseNumber.textContent = String(number);

    const verseText = document.createElement('span');
    verseText.className = 'verse-text';
    verseText.textContent = text;

    paragraph.append(verseNumber, ' ', verseText);
    verseList.append(paragraph);
  });

  verseContainer.replaceChildren(heading, verseList);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function normalizeVerses(rawVerses) {
  if (Array.isArray(rawVerses)) return rawVerses;

  if (!rawVerses || typeof rawVerses !== 'object') return [];

  if (rawVerses.verses !== undefined) {
    return normalizeVerses(rawVerses.verses);
  }

  return Object.keys(rawVerses)
    .filter(key => /^\d+$/.test(key))
    .sort((a, b) => Number(a) - Number(b))
    .map(key => rawVerses[key]);
}

function getVerseDetails(verse, index) {
  if (typeof verse === 'string' || typeof verse === 'number') {
    return { text: String(verse), number: index + 1 };
  }

  if (!verse || typeof verse !== 'object') {
    return { text: '', number: index + 1 };
  }

  const text =
    verse.text ??
    verse.content ??
    verse.val ??
    verse.value ??
    (typeof verse.verse === 'string' && !/^\d+$/.test(verse.verse)
      ? verse.verse
      : '');

  const suppliedNumber = verse.number ?? (
    /^\d+$/.test(String(verse.verse ?? '')) ? verse.verse : null
  );

  return {
    text: String(text),
    number: suppliedNumber ?? index + 1
  };
}

init();
