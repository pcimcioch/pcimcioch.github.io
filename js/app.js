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

  function Status() {
    // ------------------- Methods -------------------
    this.setStatusBusy = function(status) {
      setStatus(status, 'text-muted', 'glyphicon glyphicon-time text-muted');
    };

    this.setStatusFinished = function(status) {
      setStatus(status, 'text-success', 'glyphicon glyphicon-ok text-success');
    };

    this.setStatusFinishedWithError = function(status) {
      setStatus(status, 'text-danger', 'glyphicon glyphicon-warning text-success');
    };

    this.setLastIdStatusBusy = function() {
      setLastIdStatus('Synchronizing', 'glyphicon glyphicon-transfer text-muted');
    };

    this.setLastIdStatusUpToDate = function() {
      setLastIdStatus('lastId up to date', 'glyphicon glyphicon-ok text-success');
    };

    this.setLastIdStatusUpdated = function() {
      setLastIdStatus('Newer lastId downloaded', 'glyphicon glyphicon-download text-success');
    };

    this.setLastIdStatusSaved = function() {
      setLastIdStatus('Saved newer lastId', 'glyphicon glyphicon-floppy-saved text-success');
    };

    this.setLastIdStatusNotLoaded = function() {
      setLastIdStatus('Unable to load lastId', 'glyphicon glyphicon-download text-danger');
    };

    this.setLastIdStatusNotSaved = function() {
      setLastIdStatus('Unable to save newer lastId', 'glyphicon glyphicon-floppy-remove text-danger');
    };

    this.setNewImagesStatusBusy = function() {
      setNewImagesStatus('Synchronizing', 'glyphicon glyphicon-transfer text-muted');
    };

    this.setNewImagesStatusUpdated = function() {
      setNewImagesStatus('Downloaded newest data', 'glyphicon glyphicon-ok text-success');
    };

    this.setNewImagesStatusNotUpdated = function() {
      setNewImagesStatus('Unable to download newest data', 'glyphicon glyphicon-download text-danger');
    };

    // ------------------- View -------------------
    const setStatus = function(status, textClass, glyphClass) {
      $('#status').removeClass().addClass(textClass).text(status);
      $('#status-status').removeClass().addClass(glyphClass);
    };

    const setLastIdStatus = function(status, glyphClass) {
      $('#last-id-status').removeClass().addClass(glyphClass).prop('title', status);
    };

    const setNewImagesStatus = function(status, glyphClass) {
      $('#new-images-status').removeClass().addClass(glyphClass).prop('title', status);
    };
  }

  function Scraper() {
    const self = this;

    const CORS_URL = 'https://cors.io/?';
    const API_URL = 'https://joemonster.org/szaffa/najnowsze_fotki/strona/';
    const ELEM_REGEX = /href='\/p\/([0-9]+)\/[\s\S]*?\/upload\/(.*?)\/s_(.*?)'/g;
    const IMG_SRC_URL = "https://vader.joemonster.org/upload/";

    // ------------------- Methods -------------------
    this.getLatestId = function(success, failure) {
      self.getPage(1, function(elements) {
        success(elements[0].id);
      }, failure);
    };

    this.getElementsFromPage = function(page, success, failure) {
      $.get(CORS_URL + API_URL + page)
        .done(function(html) {
          success(extractElements(html));
        })
        .fail(failure);
    };

    // ------------------- Internal -------------------\
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
    this.setToken = function(token) {
      self.token = token;
      localStorage.setItem('token', token);
      refreshToken();
    };

    this.setLastId = function(lastId) {
      self.lastId = lastId ? parseInt(lastId) : null;
      localStorage.setItem('lastId', self.lastId);
      refreshLastId();
    };

    this.pruneElements = function() {
      if (self.elements.length === 0) {
        return;
      }
      if (self.elements[0].id !== self.lastId) {
        setElements([]);
        return;
      }

      const prunedElements = jQuery.grep(self.elements, function(elem) {
        return elem.id >= self.lastId;
      });
      setElements(prunedElements);
    };

    this.addElements = function(elementsToAdd) {
      if (self.elements.length > 0) {
        elementsToAdd = jQuery.grep(elementsToAdd, function(elem) {
          return elem.id > self.elements[self.elements.length - 1].id;
        });
      } else {
        elementsToAdd = jQuery.grep(elementsToAdd, function(elem) {
          return elem.id >= self.lastId;
        });
      }

      setElements(self.elements.concat(elementsToAdd));
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

  function App(data, externalData, scraper, status) {
    const self = this;

    const constructor = function(data, externalData, scraper, status) {
      self.data = data;
      self.externalData = externalData;
      self.scraper = scraper;
      self.status = status;
      self.loading = false;
    };

    // ------------------- Methods -------------------
    this.start = function() {
      if (self.data.isLoaded() && !self.loading) {
        self.loading = true;
        self.status.setStatusBusy('Getting lastId');
        self.status.setLastIdStatusBusy();

        self.externalData.readValue(self.data.token, handleExternalLastIdGot, handleExternalLastIdGetFailed);
      }
    };

    // ------------------- Internal -------------------
    const handleExternalLastIdGot = function(externalLastId) {
      if (externalLastId > self.data.lastId) {
        self.data.setLastId(externalLastId);
        self.status.setLastIdStatusUpdated();
        lastIdUpdated();
      } else if (externalLastId === self.data.lastId) {
        self.status.setLastIdStatusUpToDate();
        lastIdUpdated();
      } else {
        self.status.setStatusBusy('Saving lastId');
        self.externalData.saveValue(self.data.token, self.data.lastId, handleExternalLastIdSaved, handleExternalLastIdSaveFailed);
      }
    };

    const handleExternalLastIdSaved = function() {
      self.status.setLastIdStatusSaved();
      lastIdUpdated();
    };

    const handleExternalLastIdSaveFailed = function() {
      self.status.setLastIdStatusNotSaved();
      lastIdUpdated();
    };

    const handleExternalLastIdGetFailed = function() {
      self.status.setLastIdStatusNotLoaded();
      lastIdUpdated();
    };

    const lastIdUpdated = function() {
      self.data.pruneElements();
      const lastElementId = self.data.elements.length > 0 ? self.data.elements[self.data.elements.length - 1].id : self.data.lastId;

      self.status.setNewImagesStatusBusy();
      scrapPage(1, [], lastElementId, scrappingFinished);
    };

    const scrapPage = function(page, elements, lastElementId, success) {
      self.status.setStatusBusy('Scrapping ' + page);
      self.scraper.getElementsFromPage(page, function(scrappedElements) {
        elements = scrappedElements.reverse().concat(elements);
        if (elements[0].id <= lastElementId) {
          success(elements);
        } else {
          scrapPage(page + 1, elements, lastElementId, success);
        }
      }, handleScrappingFailed);
    };

    const handleScrappingFailed = function() {
      self.status.setNewImagesStatusNotUpdated();

      self.status.setStatusFinishedWithError('Scrapping Failed');
      finish();
    };

    const scrappingFinished = function(elements) {
      self.data.addElements(elements);
      self.status.setNewImagesStatusUpdated();

      self.status.setStatusFinished('Loaded');
      finish();
    };

    const finish = function() {
      self.loading = false;
    };

    //------------------- Constructor -------------------
    constructor(data, externalData, scraper, status);
  }

  function SettingsView(data, externalData, scraper, app) {
    const self = this;

    const constructor = function(data, externalData, scraper, app) {
      self.data = data;
      self.externalData = externalData;
      self.scraper = scraper;
      self.app = app;
      self.loaded = false;

      $('#save-settings').click(function() {
        applySettings();
        self.app.start();
      });

      $('#settings-heading').click(function() {
        setupInputs();
        markRegenerationReady('#regenerate-token', '#regenerate-token-status');
        markRegenerationReady('#regenerate-last-id', '#regenerate-last-id-status');
      });

      $('#regenerate-token').click(function() {
        regenerateToken();
      });

      $('#regenerate-last-id').click(function() {
        regenerateLastId();
      });
    };

    // ------------------- Internal -------------------
    const applySettings = function() {
      self.data.setToken($('#token-input').val());
      self.data.setLastId($('#last-id-input').val());
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


  const data = new Data();
  const externalData = new ExternalData();
  const status = new Status();
  const scraper = new Scraper();
  const app = new App(data, externalData, scraper, status);
  const settingsView = new SettingsView(data, externalData, scraper, app);

  app.start();

});