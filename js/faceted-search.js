import React, { useEffect, useState } from 'react';
import List from 'list.js';

const FacetedSearch = ({ searchPath }) => {
  const [facets, setFacets] = useState({ categories: [], authors: [], dates: [] });
  const [listInstance, setListInstance] = useState(null);


  useEffect(() => {
    let list = null;
    fetch(searchPath)
      .then(response => response.json())
      .then(data => {
        setFacets(data.facets);
        const options = {
          valueNames: ['title', 'content', { name: 'url', attr: 'href' }, { name: 'category', attr: 'data-category' }, { name: 'author', attr: 'data-author' }, { name: 'date', attr: 'data-date' }],
          item: '<li><h3 class="title"></h3><p class="content"></p><a class="url"></a><span class="category"></span><span class="author"></span><span class="date"></span></li>',
          listClass: 'search-results'
        };
        const listData = data.documents.map(doc => ({
          title: doc.title,
          content: doc.content,
          url: doc.url,
          category: doc.rdf.find(r => r.predicate === 'category')?.object || '',
          author: doc.rdf.find(r => r.predicate === 'author')?.object || '',
          date: doc.rdf.find(r => r.predicate === 'created')?.object || ''
        }));
        // Destroy previous List.js instance if exists
        if (listInstance) {
          listInstance.destroy();
        }
        list = new List('search-container', options, listData);
        setListInstance(list);
      });
    return () => {
      if (list) list.destroy();
    };
  }, [searchPath]);

  const handleFilter = (facet, value) => {
    if (listInstance) {
      listInstance.filter(item => {
        if (value === '') return true;
        return item.values()[facet] === value;
      });
    }
  };

  return (
    <div id="search-container">
      <div>
        <label>Category:</label>
        <select onChange={(e) => handleFilter('category', e.target.value)}>
          <option value="">All</option>
          {facets.categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>
      <div>
        <label>Author:</label>
        <select onChange={(e) => handleFilter('author', e.target.value)}>
          <option value="">All</option>
          {facets.authors.map(auth => <option key={auth} value={auth}>{auth.split('/').pop()}</option>)}
        </select>
      </div>
      <div>
        <label>Date:</label>
        <select onChange={(e) => handleFilter('date', e.target.value)}>
          <option value="">All</option>
          {facets.dates.map(date => <option key={date} value={date}>{date}</option>)}
        </select>
      </div>
      <ul className="search-results"></ul>
    </div>
  );
};

export default FacetedSearch;