/*jshint esversion: 6 */

jQuery(document).ready(function($) {
  'use strict';

  function ExternalData() {
    const API_URL = 'https://api.keyvalue.xyz';
    const KEY = 'lastId';

    // ------------------- Methods -------------------
    this.generateToken = function(success, failure) {
      $.post(API_URL + '/new/' + KEY)
        .done(function(data) {
          const token = data.substring(API_URL.length + 1, data.length - KEY.length - 2);
          success(token);
        })
        .fail(failure);
    };

    this.saveValue = function(token, value, success, failure) {
      $.post(API_URL + '/' + token + '/' + KEY + '/' + value)
        .done(success)
        .fail(failure);
    };

    this.readValue = function(token, success, failure) {
      $.get(API_URL + '/' + token + '/' + KEY)
        .done(function(data) {
          success(parseInt(data));
        })
        .fail(failure);
    };
  }

  function Data() {
    const self = this;

    const constructor = function() {
      loadData();

      refreshToken();
      refreshLastId();
      refreshNewImages();
    };

    // ------------------- Methods -------------------
    this.setup = function(token, lastId) {
      setLastId(lastId);
      setToken(token);
      setElements([]);
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
      return self.lastId && self.token;
    };

    // ------------------- Internal -------------------
    const loadData = function() {
      self.token = localStorage.getItem('token');
      self.lastId = parseInt(localStorage.getItem('lastId')) || null;
      self.elements = JSON.parse(localStorage.getItem('elements')) || [];
    };

    const setToken = function(token) {
      self.token = token;
      localStorage.setItem('token', token);
      refreshToken();
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
      refreshNewImages();
    };

    // ------------------- View -------------------
    const refreshToken = function() {
      $('#token').text(self.token);
    };

    const refreshLastId = function() {
      $('#last-id').text(self.lastId);
    };

    const refreshNewImages = function() {
      $('#new-images').text(self.elements.length);
    };

    //------------------- Constructor -------------------
    constructor();
  }

  function LastIdSync(data, externalData) {
    const self = this;

    const constructor = function(data, externalData) {
      self.data = data;
      self.externalData = externalData;
    };

    // ------------------- Methods -------------------
    this.synchronizeLastId = function(done) {
      setLastIdStatus('Synchronizing', 'glyphicon glyphicon-transfer text-muted');
      self.externalData.readValue(self.data.token, function(externalLastId) {
        handleExternalLastIdGot(externalLastId, done);
      }, function() {
        handleExternalLastIdGetFailed(done);
      });
    };

    const handleExternalLastIdGot = function(externalLastId, done) {
      if (externalLastId > self.data.lastId) {
        self.data.updateLastId(externalLastId);
        setLastIdStatus('Newer lastId downloaded', 'glyphicon glyphicon-download text-success');
        done();
      } else if (externalLastId === self.data.lastId) {
        setLastIdStatus('lastId up to date', 'glyphicon glyphicon-ok text-success');
        done();
      } else {
        self.externalData.saveValue(self.data.token, self.data.lastId, function() {
          handleExternalLastIdSaved(done);
        }, function() {
          handleExternalLastIdSaveFailed(done);
        });
      }
    };

    const handleExternalLastIdSaved = function(done) {
      setLastIdStatus('Saved newer lastId', 'glyphicon glyphicon-floppy-saved text-success');
      done();
    };

    const handleExternalLastIdSaveFailed = function(done) {
      setLastIdStatus('Unable to save newer lastId', 'glyphicon glyphicon-floppy-remove text-danger');
      done();
    };

    const handleExternalLastIdGetFailed = function(done) {
      setLastIdStatus('Unable to load lastId', 'glyphicon glyphicon-download text-danger');
      done();
    };

    //------------------- View -------------------
    const setLastIdStatus = function(status, glyphClass) {
      $('#last-id-status').removeClass().addClass(glyphClass).prop('title', status);
    };

    //------------------- Constructor -------------------
    constructor(data, externalData);
  }

  function Scraper(data) {
    const self = this;

    const CORS_URL = 'https://cors.io/?';
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
      $.get(CORS_URL + API_URL + page)
        .done(function(html) {
          success(extractElements(html));
        })
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

  function Images(data, lastIdSync) {
    const self = this;

    const FETCH_SIZE = 25;
    const IMG_URL = 'http://www.joemonster.org/szaffa/';

    const constructor = function(data, lastIdSync) {
      self.data = data;
      self.lastIdSync = lastIdSync;

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
        self.lastIdSync.synchronizeLastId(function(){});
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
    constructor(data, lastIdSync);
  }

  function App(data, lastIdSync, scraper, images) {
    const self = this;

    const constructor = function(data, lastIdSync, scraper, images) {
      self.data = data;
      self.lastIdSync = lastIdSync;
      self.scraper = scraper;
      self.images = images;
      self.loading = false;
    };

    // ------------------- Methods -------------------
    this.start = function() {
      if (self.data.isLoaded() && !self.loading) {
        self.loading = true;
        setStatusBusy('Synchronizing lastId');
        self.lastIdSync.synchronizeLastId(lastIdUpdated);
      }
    };

    // ------------------- Internal -------------------
    const lastIdUpdated = function() {
      setStatusBusy('Scrapping images');
      self.scraper.scrapNewElements(scrappingFinished);
    };

    const scrappingFinished = function() {
      setStatusFinished('Loaded');
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
    constructor(data, lastIdSync, scraper, images);
  }

  function SettingsView(data, externalData, scraper, app) {
    const self = this;

    const constructor = function(data, externalData, scraper, app) {
      self.data = data;
      self.externalData = externalData;
      self.scraper = scraper;
      self.app = app;
      self.loaded = false;

      $('#save-settings').on('click', saveSettings);
      $('#settings-heading').on('click', setupSettings);
      $('#regenerate-token').on('click', regenerateToken);
      $('#regenerate-last-id').on('click', regenerateLastId);
    };

    // ------------------- Internal -------------------
    const saveSettings = function() {
      applySettings();
      self.app.start();
    };

    const applySettings = function() {
      self.data.setup($('#token-input').val(), $('#last-id-input').val());
    };

    const setupSettings = function() {
      setupInputs();
      markRegenerationReady('#regenerate-token', '#regenerate-token-status');
      markRegenerationReady('#regenerate-last-id', '#regenerate-last-id-status');
    };

    const regenerateToken = function() {
      markRegenerationStart('#regenerate-token', '#regenerate-token-status');

      self.externalData.generateToken(function(token) {
        $('#token-input').val(token);
        markRegenerationSuccess('#regenerate-token', '#regenerate-token-status');
      }, function() {
        markRegenerationFailure('#regenerate-token', '#regenerate-token-status');
      });
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
      $('#token-input').val(self.data.token);
      $('#last-id-input').val(self.data.lastId);
    };

    //------------------- Constructor -------------------
    constructor(data, externalData, scraper, app);
  }

  const externalData = new ExternalData();
  const data = new Data();
  const lastIdSync = new LastIdSync(data, externalData);
  const scraper = new Scraper(data);
  const images = new Images(data, lastIdSync);
  const app = new App(data, lastIdSync, scraper, images);
  const settingsView = new SettingsView(data, externalData, scraper, app);

  app.start();

});