// Cache for API responses to reduce rate limiting
const cache = {};
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

// Popular search terms for featured books
const popularQueries = ['fiction', 'classic', 'bestseller', 'novel', 'science', 'history', 'philosophy', 'poetry'];

// Current search state for pagination
let currentSearchQuery = '';
let currentPage = 1;
let totalResults = 0;

// Helper function for cached fetch
async function cachedFetch(url) {
  if (cache[url] && (Date.now() - cache[url].timestamp < CACHE_DURATION)) {
    return cache[url].data;
  }
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    
    cache[url] = {
      data: data,
      timestamp: Date.now()
    };
    
    return data;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

// Enhanced book card creator with availability check
function createBookCard(book, customTitle = null) {
  const coverId = book.cover_i || book.cover_edition_key;
  const coverUrl = coverId
    ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
    : "https://via.placeholder.com/200x300?text=No+Cover";

  const title = customTitle || book.title || "No Title";
  const author = book.author_name ? book.author_name.join(", ") : "Unknown Author";
  const firstPublishYear = book.first_publish_year || 'Unknown';
  
  // Check if ebook is available
  const hasEbook = book.ebook_access === 'borrowable' || book.ebook_access === 'printdisabled' || book.ebook_count_i > 0;
  const workKey = book.key;
  const readLink = workKey ? `https://openlibrary.org${workKey}` : "#";
  
  const buttonText = hasEbook ? '📖 Read Online' : '🔍 View Details';
  const buttonClass = hasEbook ? 'btn-success' : 'btn-primary';
  
  return `
    <div class="col-lg-3 col-md-4 col-sm-6">
      <div class="my-card p-3">
        <div class="position-relative">
          <img src="${coverUrl}" class="book-img" alt="Book Cover" loading="lazy">
          ${hasEbook ? '<span class="ebook-badge"><i class="bi bi-book"></i> eBook</span>' : ''}
        </div>
        <div class="p-2">
          <h5 class="book-title" title="${title}">${title.length > 50 ? title.substring(0, 50) + '...' : title}</h5>
          <p class="book-author">${author}</p>
          <p class="book-year"><i class="bi bi-calendar3"></i> ${firstPublishYear}</p>
          <div class="d-flex gap-2">
            <a href="${readLink}" target="_blank" class="btn btn-sm ${buttonClass} flex-grow-1">
              ${buttonText}
            </a>
            <button class="btn btn-sm btn-outline-secondary" onclick="alert('Add to wishlist feature coming soon!')">
              <i class="bi bi-bookmark-plus"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Load featured books with random popular queries
async function loadFeaturedBooks() {
  const featuredContainer = document.getElementById("featuredBooks");
  
  // Show loading spinner
  featuredContainer.innerHTML = `
    <div class="col-12 text-center my-5">
      <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-3 text-muted">Discovering great books for you...</p>
    </div>
  `;

  try {
    // Get random popular query
    const randomQuery = popularQueries[Math.floor(Math.random() * popularQueries.length)];
    
    // Fetch first page to get total results
    const firstData = await cachedFetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(randomQuery)}&limit=1`
    );
    
    const totalResults = firstData.numFound || 1000;
    const totalPages = Math.min(100, Math.floor(totalResults / 8)); // Limit to 100 pages max
    
    // Get random page
    const randomPage = Math.floor(Math.random() * totalPages) + 1;
    
    // Fetch random page
    const data = await cachedFetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(randomQuery)}&limit=8&page=${randomPage}`
    );

    let output = "";
    
    if (data.docs && data.docs.length > 0) {
      data.docs.forEach((book) => {
        output += createBookCard(book);
      });
      
      // Add info about the category
      output += `
        <div class="col-12 text-center mt-3">
          <small class="text-muted">
            <i class="bi bi-info-circle"></i> Showing random books from "${randomQuery}" category
          </small>
        </div>
      `;
    } else {
      output = `
        <div class="col-12 text-center py-5">
          <i class="bi bi-emoji-frown" style="font-size: 3rem; color: #ccc;"></i>
          <h4 class="mt-3">No featured books found</h4>
          <p class="text-muted">Please try refreshing</p>
        </div>
      `;
    }
    
    featuredContainer.innerHTML = output;
  } catch (err) {
    console.error("Error fetching featured books:", err);
    featuredContainer.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="bi bi-exclamation-triangle" style="font-size: 3rem; color: #dc3545;"></i>
        <h4 class="mt-3 text-danger">Oops! Something went wrong</h4>
        <p class="text-muted">Please check your connection and try again</p>
        <button class="btn btn-primary mt-3" onclick="loadFeaturedBooks()">
          <i class="bi bi-arrow-repeat"></i> Try Again
        </button>
      </div>
    `;
  }
}

// Search function with pagination
async function performSearch(query, page = 1, append = false) {
  const bookList = document.getElementById("bookList");
  const searchSection = document.getElementById("searchSection");
  const loadMoreContainer = document.getElementById("loadMoreContainer");
  const resultCount = document.getElementById("resultCount");
  
  if (!query) {
    searchSection.style.display = 'none';
    return;
  }

  // Show loading for first page
  if (!append) {
    searchSection.style.display = 'block';
    bookList.innerHTML = `
      <div class="col-12 text-center my-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-3 text-muted">Searching for "${query}"...</p>
      </div>
    `;
    loadMoreContainer.style.display = 'none';
  }

  try {
    const data = await cachedFetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=8&page=${page}`
    );

    if (!append) {
      totalResults = data.numFound || 0;
      resultCount.textContent = `${totalResults.toLocaleString()} results found`;
    }

    let output = append ? bookList.innerHTML : "";
    
    if (data.docs && data.docs.length > 0) {
      data.docs.forEach((book) => {
        output += createBookCard(book);
      });
      
      bookList.innerHTML = output;
      
      // Show load more if there are more results
      const totalPages = Math.ceil(totalResults / 8);
      if (page < totalPages && page < 10) { // Limit to 10 pages max
        loadMoreContainer.style.display = 'block';
      } else {
        loadMoreContainer.style.display = 'none';
      }
    } else if (!append) {
      bookList.innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="bi bi-emoji-frown" style="font-size: 3rem; color: #ccc;"></i>
          <h4 class="mt-3">No books found</h4>
          <p class="text-muted">Try searching with different keywords</p>
          <div class="mt-3">
            <span class="badge bg-light text-dark p-2 me-2">📚 Try "fiction"</span>
            <span class="badge bg-light text-dark p-2 me-2">🔬 Try "science"</span>
            <span class="badge bg-light text-dark p-2">📜 Try "history"</span>
          </div>
        </div>
      `;
    }
  } catch (err) {
    console.error("Search error:", err);
    if (!append) {
      bookList.innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="bi bi-exclamation-triangle" style="font-size: 3rem; color: #dc3545;"></i>
          <h4 class="mt-3 text-danger">Error fetching data</h4>
          <p class="text-muted">Please check your connection and try again</p>
        </div>
      `;
    }
  }
}

// Category click handler
async function handleCategoryClick(category) {
  const searchBox = document.getElementById("searchBox");
  searchBox.value = category;
  
  // Update active state
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
  
  currentSearchQuery = category;
  currentPage = 1;
  await performSearch(category, 1, false);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Load featured books
  loadFeaturedBooks();
  
  // Search button click
  document.getElementById("searchBtn").addEventListener("click", async function() {
    const query = document.getElementById("searchBox").value.trim();
    currentSearchQuery = query;
    currentPage = 1;
    await performSearch(query, 1, false);
  });

  // Enter key press
  document.getElementById("searchBox").addEventListener("keypress", async function(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      const query = e.target.value.trim();
      currentSearchQuery = query;
      currentPage = 1;
      await performSearch(query, 1, false);
    }
  });

  // Load more button
  document.getElementById("loadMoreBtn").addEventListener("click", async function() {
    currentPage++;
    await performSearch(currentSearchQuery, currentPage, true);
  });

  // Refresh featured books
  document.getElementById("refreshFeatured").addEventListener("click", function() {
    loadFeaturedBooks();
  });

  // Category buttons
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', async function(e) {
      const category = this.dataset.category;
      await handleCategoryClick(category);
      
      // Scroll to search results
      document.getElementById('searchSection').scrollIntoView({ behavior: 'smooth' });
    });
  });
});
