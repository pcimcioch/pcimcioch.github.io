/* jshint esversion: 6 */
/* jshint node: true */

jQuery(document).ready(function($) {
  'use strict';

  function Cache() {
    const self = this;

    self.DATA_CACHE_NAME = 'crawler-data-v1';
    self.MAX_CACHE_SIZE = 500;

    const constructor = function() {
      self.savedCacheSize = 0;

      refreshCacheSize();
    };

    // ------------------- Methods -------------------
    this.clearDataCache = function() {
      caches.delete(self.DATA_CACHE_NAME);
      setCacheSize(0);
    };

    this.leaveOnlyData = function(elementsToLeave) {
      if (elementsToLeave.length === 0) {
        self.clearDataCache();
        return;
      }

      elementsToLeave = resolveUrls(elementsToLeave);

      getKeys(function(keyList) {
        keyList.forEach(function(key) {
          if (elementsToLeave.indexOf(key.url) === -1) {
            removeKey(key);
          }
        });
      });
    };

    this.initPrecaching = function(elementsToPrecache) {
      setCacheStatus('Precaching...', 'glyphicon glyphicon-transfer text-muted', 0);
      getKeys(function(keyList) {
        const urlsAlreadyCached = keyList.map(elem => removeExtension(elem.url));
        elementsToPrecache = elementsToPrecache.filter(elem => urlsAlreadyCached.indexOf(elem) === -1);
        const availableCacheSize = self.MAX_CACHE_SIZE > keyList.length ? self.MAX_CACHE_SIZE - keyList.length : 0;
        elementsToPrecache = elementsToPrecache.slice(0, availableCacheSize);

        precache(elementsToPrecache, elementsToPrecache.length);
      });
    };

    // ------------------- Internal -------------------
    const refreshCacheSize = function() {
      getKeys(keyList => setCacheSize(keyList.length));
    };

    const getKeys = function(done) {
      caches.open(self.DATA_CACHE_NAME).then(function(cache) {
        cache.keys().then(function(keyList) {
          done(keyList);
        });
      });
    };

    const resolveUrls = function(urls) {
      return urls.flatMap(elem => [
        elem + '.jpg',
        elem + '.png',
        elem + '.gif'
      ]);
    };

    const removeExtension = function(filename) {
      return filename.replace(/\.[^/.]+$/, "");
    };

    const removeKey = function(key) {
      caches.open(self.DATA_CACHE_NAME).then(function(cache) {
        cache.delete(key);
      });
    };

    const precache = function(elementsToPrecache, totalSize) {
      if (elementsToPrecache.length === 0) {
        finishPrecaching();
        return;
      }

      const element = elementsToPrecache.shift();
      $('#cache-image-view')
        .off('load')
        .off('error')
        .attr('src', element + '.jpg')
        .on('load', function() {
          precacheSuccess(elementsToPrecache, totalSize);
        })
        .on('error', function(event) {
          precacheFail(event.target, elementsToPrecache, totalSize);
        });
    };

    const precacheSuccess = function(elementsToPrecache, totalSize) {
      const percent = Math.floor((totalSize - elementsToPrecache.length) * 100 / totalSize);
      setCacheStatus('Precaching...', 'glyphicon glyphicon-transfer text-muted', percent);
      precache(elementsToPrecache, totalSize);
    };

    const precacheFail = function(img, elementsToPrecache, totalSize) {
      const oldSrc = img.src;
      let newSrc = oldSrc.replace('.png', '.gif');
      newSrc = newSrc.replace('.jpg', '.png');

      if (newSrc !== oldSrc) {
        img.src = newSrc;
      } else {
        precache(elementsToPrecache, totalSize);
      }
    };

    const finishPrecaching = function() {
      setCacheStatus('Cached', 'glyphicon glyphicon-ok text-success');
      refreshCacheSize();
    };

    // ------------------- View -------------------
    const setCacheSize = function(cacheSize) {
      self.savedCacheSize = cacheSize;
      $('#cached-images').text(cacheSize);
    };

    const setCacheStatus = function(status, glyphClass, percent = -1) {
      $('#cached-images-status').removeClass().addClass(glyphClass).prop('title', status);
      $('#cached-images-percent').text(percent === -1 ? '' : (percent + '%'));
    };
    // ------------------- Constructor -------------------
    constructor();
  }

  function Data(cache) {
    const self = this;

    const constructor = function(cache) {
      self.cache = cache;

      loadData();

      refreshLastId();
      refreshNewImages();
    };

    // ------------------- Methods -------------------
    this.setup = function(lastId) {
      if (self.lastId !== lastId) {
        setElements([]);
      }
      setLastId(lastId);
    };

    this.updateLastId = function(lastId) {
      setLastId(lastId);
      pruneElements();
    };

    this.addElements = function(elementsToAdd) {
      if (elementsToAdd.length === 0) {
        return;
      }

      const thresholdId = self.elements.length > 0 ? self.elements[self.elements.length - 1].id : self.lastId;
      elementsToAdd = elementsToAdd.filter(elem => elem.id > thresholdId);

      setElements(self.elements.concat(elementsToAdd));
    };

    this.removeElements = function(elementsToRemove) {
      if (elementsToRemove.length === 0) {
        return;
      }
      const idsToRemove = elementsToRemove.map(elem => elem.id);
      const newElements = self.elements.filter(elem => idsToRemove.indexOf(elem.id) === -1);

      const lastIdFromRemovedElements = idsToRemove[idsToRemove.length - 1];
      if (lastIdFromRemovedElements > self.lastId) {
        setLastId(lastIdFromRemovedElements);
      }

      setElements(newElements);
    };

    this.isLoaded = function() {
      return self.lastId;
    };

    this.getElementUrls = function() {
      return self.elements.map(elem => elem.url);
    };

    // ------------------- Internal -------------------
    const loadData = function() {
      self.lastId = parseInt(localStorage.getItem('lastId')) || null;
      self.elements = JSON.parse(localStorage.getItem('elements')) || [];
    };

    const setLastId = function(lastId) {
      self.lastId = lastId ? parseInt(lastId) : null;
      localStorage.setItem('lastId', self.lastId);
      refreshLastId();
    };

    const pruneElements = function() {
      if (self.elements.length === 0) {
        return;
      }

      const prunedElements = self.elements.filter(elem => elem.id > self.lastId);
      setElements(prunedElements);
    };

    const setElements = function(elements) {
      self.elements = elements;
      localStorage.setItem('elements', JSON.stringify(self.elements));
      self.cache.leaveOnlyData(self.getElementUrls());
      refreshNewImages();
    };

    // ------------------- View -------------------
    const refreshLastId = function() {
      $('#last-id').text(self.lastId);
    };

    const refreshNewImages = function() {
      $('#new-images').text(self.elements.length);
    };

    //------------------- Constructor -------------------
    constructor(cache);
  }

  function Scraper(data) {
    const self = this;

    const CORS_URL = 'https://api.codetabs.com/v1/tmp/?quest=';
    const API_URL = 'https://joemonster.org/szaffa/najnowsze_fotki/strona/';
    const ELEM_REGEX = /href='\/p\/([0-9]+)\/[\s\S]*?\/upload\/(.*?)\/s_(.*?)'/g;
    const IMG_SRC_URL = "https://vader.joemonster.org/upload/";

    const constructor = function(data) {
      self.data = data;
    };

    // ------------------- Methods -------------------
    this.getLatestId = function(success, failure) {
      getElementsFromPage(1, function(elements) {
        success(elements[0].id);
      }, failure);
    };

    this.scrapNewElements = function(done) {
      setNewImagesStatus('Synchronizing', 'glyphicon glyphicon-transfer text-muted');
      const lastElementId = self.data.elements.length > 0 ? self.data.elements[self.data.elements.length - 1].id : self.data.lastId;
      scrapPage(1, [], lastElementId, scrappingFinished, done);
    };

    // ------------------- Internal -------------------
    const scrapPage = function(page, elements, lastElementId, finished, done) {
      getElementsFromPage(page, function(scrappedElements) {
        elements = scrappedElements.reverse().concat(elements);
        if (elements[0].id <= lastElementId) {
          finished(elements, done);
        } else {
          scrapPage(page + 1, elements, lastElementId, finished, done);
        }
      }, function() {
        handleScrappingFailed(done);
      });
    };

    const handleScrappingFailed = function(done) {
      setNewImagesStatus('Unable to download newest data', 'glyphicon glyphicon-download text-danger');
      done();
    };

    const scrappingFinished = function(elements, done) {
      self.data.addElements(elements);
      setNewImagesStatus('Downloaded newest data', 'glyphicon glyphicon-ok text-success');
      done();
    };

    const getElementsFromPage = function(page, success, failure) {
      const accept = function(html) {
        success(extractElements(html));
      };

      $.get(CORS_URL + API_URL + page)
        .done(accept)
        .fail(failure);
    };

    const extractElements = function(html) {
      const elements = [];

      let match = ELEM_REGEX.exec(html);
      while (match) {
        const id = match[1];
        const category = match[2];
        const filename = match[3];
        elements.push({id: parseInt(id), url: (IMG_SRC_URL + category + '/' + removeExtension(filename))});
        match = ELEM_REGEX.exec(html);
      }

      return elements;
    };

    const removeExtension = function(filename) {
      return filename.replace(/\.[^/.]+$/, "");
    };

    //------------------- View -------------------
    const setNewImagesStatus = function(status, glyphClass) {
      $('#new-images-status').removeClass().addClass(glyphClass).prop('title', status);
    };

    //------------------- Constructor -------------------
    constructor(data);
  }

  function Images(data) {
    const self = this;

    const FETCH_SIZE = 25;
    const IMG_URL = 'http://www.joemonster.org/szaffa/';

    const constructor = function(data) {
      self.data = data;

      self.displayedElements = [];

      $('#fetch-next')
        .on('click', self.showNextBatch)
        .hide();
    };

    //------------------- Methods -------------------
    this.showNextBatch = function() {
      clearCurrentImages();
      self.data.elements.slice(0, FETCH_SIZE).forEach(appendElement);

      if (self.displayedElements.length === 0) {
        $('#fetch-next').hide();
      } else {
        $('#fetch-next').show();
        $('#images')[0].scrollIntoView(true);
      }
    };

    //------------------- Internal -------------------
    const clearCurrentImages = function() {
      $('#images').html('');
      if (self.displayedElements.length > 0) {
        self.data.removeElements(self.displayedElements);
        self.displayedElements = [];
      }
    };

    const appendElement = function(element) {
      const img = $('<img>', {src: element.url + '.jpg'})
        .on('error', imageErrorHandler);
      const link = $('<h4/>').append(
        $('<strong/>').append(
          $('<a/>', {
            href: IMG_URL + element.id,
            target: '_blank',
            text: element.id
          })
        )
      );
      const panel = $('<div/>', {class: 'panel panel-default'})
        .append($('<div/>', {class: 'panel-heading'}).append(link))
        .append($('<div/>', {class: 'panel-body'}).append(img));

      $('#images').append(panel).append($('<br>'));

      self.displayedElements.push(element);
    };

    const imageErrorHandler = function(event) {
      const img = event.target;

      const oldSrc = img.src;
      let newSrc = oldSrc.replace('.png', '.gif');
      newSrc = newSrc.replace('.jpg', '.png');

      if (newSrc !== oldSrc) {
        img.src = newSrc;
      }

      return true;
    };

    //------------------- Constructor -------------------
    constructor(data);
  }

  function App(data, cache, scraper, images) {
    const self = this;

    const constructor = function(data, cache, scraper, images) {
      self.data = data;
      self.cache = cache;
      self.scraper = scraper;
      self.images = images;
      self.loading = false;
    };

    // ------------------- Methods -------------------
    this.start = function() {
      if (self.data.isLoaded() && !self.loading) {
        self.loading = true;
        setStatusBusy('Scrapping images');
        self.scraper.scrapNewElements(scrappingFinished);
      }
    };

    // ------------------- Internal -------------------
    const scrappingFinished = function() {
      setStatusFinished('Loaded');
      self.cache.initPrecaching(self.data.getElementUrls());
      finish();
    };

    const finish = function() {
      self.loading = false;
      self.images.showNextBatch();
    };

    // ------------------- View -------------------
    const setStatusBusy = function(status) {
      setStatus(status, 'text-muted', 'glyphicon glyphicon-time text-muted');
    };

    const setStatusFinished = function(status) {
      setStatus(status, 'text-success', 'glyphicon glyphicon-ok text-success');
    };

    const setStatus = function(status, textClass, glyphClass) {
      $('#status').removeClass().addClass(textClass).text(status);
      $('#status-status').removeClass().addClass(glyphClass);
    };

    //------------------- Constructor -------------------
    constructor(data, cache, scraper, images);
  }

  function SettingsView(data, scraper, app, cache) {
    const self = this;

    const constructor = function(data, scraper, app, cache) {
      self.data = data;
      self.scraper = scraper;
      self.app = app;
      self.cache = cache;

      self.loaded = false;

      $('#save-settings').on('click', saveSettings);
      $('#settings-panel').on('shown.bs.collapse', setupSettings);
      $('#regenerate-last-id').on('click', regenerateLastId);
      $('#cache-clear').on('click', self.cache.clearDataCache);
    };

    // ------------------- Internal -------------------
    const saveSettings = function() {
      applySettings();
      self.app.start();
    };

    const applySettings = function() {
      self.data.setup($('#last-id-input').val());
    };

    const setupSettings = function() {
      setupInputs();
      markRegenerationReady('#regenerate-last-id', '#regenerate-last-id-status');
    };

    const regenerateLastId = function() {
      markRegenerationStart('#regenerate-last-id', '#regenerate-last-id-status');

      self.scraper.getLatestId(function(latestId) {
        $('#last-id-input').val(latestId);
        markRegenerationSuccess('#regenerate-last-id', '#regenerate-last-id-status');
      }, function() {
        markRegenerationFailure('#regenerate-last-id', '#regenerate-last-id-status');
      });
    };

    // ------------------- View -------------------
    const markRegenerationReady = function(button, status) {
      $(button).prop('disabled', false);
      $(status).removeClass().addClass('glyphicon glyphicon-refresh').prop('title');
    };

    const markRegenerationStart = function(button, status) {
      $(button).prop('disabled', true);
      $(status).removeClass().addClass('glyphicon glyphicon-time').prop('title', 'In progress');
    };

    const markRegenerationSuccess = function(button, status) {
      $(status).removeClass().addClass('glyphicon glyphicon-ok').prop('title', 'Completed');
      $(button).prop('disabled', false);
    };

    const markRegenerationFailure = function(button, status) {
      $(status).removeClass().addClass('glyphicon glyphicon-alert').prop('title', 'Connection Error');
      $(button).prop('disabled', false);
    };

    const setupInputs = function() {
      $('#last-id-input').val(self.data.lastId);
    };

    //------------------- Constructor -------------------
    constructor(data, scraper, app, cache);
  }

  const cache = new Cache();
  const data = new Data(cache);
  const scraper = new Scraper(data);
  const images = new Images(data);
  const app = new App(data, cache, scraper, images);
  const settingsView = new SettingsView(data, scraper, app, cache);

  navigator.serviceWorker
    .register('./service-worker.js')
    .then(app.start);

});
