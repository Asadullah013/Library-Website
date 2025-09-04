
  // Reusable function to make cards
  function createBookCard(info, customTitle = null) {
    return `
      <div class="col-md-3 col-sm-6">
        <div class="my-card p-2">
          <img src="${info.imageLinks ? info.imageLinks.thumbnail : 'https://via.placeholder.com/128x200?text=No+Image'}" 
               class="book-img" alt="Book Cover">
          <div class="p-2">
            <h5 class="book-title">${customTitle || info.title || "No Title"}</h5>
            <p class="book-author">${info.authors ? info.authors.join(", ") : "Unknown Author"}</p>
            <a href="${info.previewLink || '#'}" target="_blank" class="btn btn-sm btn-primary">Preview</a>
          </div>
        </div>
      </div>
    `;
  }

   // Featured Queries (custom selection - 8 books)
  const featuredQueries = [
    { query: "Quran: Arabic, English, Persian", label: "📖 The Holy Quran" },
    { query: "Atomic Habits James Clear", label: "📘 Atomic Habits" },
    { query: "To Kill a Mockingbird", label: "⚖️ To Kill a Mockingbird" },
    { query: "The Alchemist Paulo Coelho", label: "🌍 The Alchemist" }
  ];

  // Load Featured Books
  async function loadFeaturedBooks() {
    let output = "";
    for (let item of featuredQueries) {
      try {
        let res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(item.query)}&maxResults=1`);
        let data = await res.json();
        if (data.items && data.items.length > 0) {
          let book = data.items[0].volumeInfo;
          output += createBookCard(book, item.label);
        }
      } catch (err) {
        console.error("Error fetching featured:", err);
      }
    }
    document.getElementById("featuredBooks").innerHTML = output || "<p class='text-center'>No featured books found.</p>";
  }

  

  // Search Function
  document.getElementById("searchBtn").addEventListener("click", function() {
    let query = document.getElementById("searchBox").value.trim();
    if (!query) {
      document.getElementById("bookList").innerHTML = "<p class='text-center text-muted'>Please enter a search term.</p>";
      return;
    }

    fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=8`)
      .then(res => res.json())
      .then(data => {
        let output = "";
        (data.items || []).forEach(book => {
          output += createBookCard(book.volumeInfo);
        });
        document.getElementById("bookList").innerHTML = output || "<p class='text-center'>No books found.</p>";
      })
      .catch(err => {
        console.error(err);
        document.getElementById("bookList").innerHTML = "<p class='text-danger text-center'>Error fetching data.</p>";
      });
      
  });
  

  // On page load
  loadFeaturedBooks();


