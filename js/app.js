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
          if (success) {
            success(token);
          }
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
          if (success) {
            success(parseInt(data));
          }
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

    this.setData = function(data) {
      self.data = data;
      localStorage.setItem('data', JSON.stringify(self.data));
      refreshNewImages();
    };

    this.isLoaded = function() {
      return self.lastId && self.token;
    };

    this.setStatusBusy = function(status) {
      setStatus(status, 'text-muted', 'glyphicon glyphicon-time text-muted');
    };

    this.setStatusFinished = function(status) {
      setStatus(status, 'text-success', 'glyphicon glyphicon-ok text-success');
    };

    this.setLastIdStatusBusy = function() {
      setLastIdStatus('glyphicon glyphicon-transfer text-muted');
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

    // ------------------- Internal -------------------
    const loadData = function() {
      self.token = localStorage.getItem('token');
      self.lastId = parseInt(localStorage.getItem('lastId')) || null;
      self.data = JSON.parse(localStorage.getItem('data')) || [];
    };

    // ------------------- View -------------------
    const refreshToken = function() {
      $('#token').text(self.token);
    };

    const refreshLastId = function() {
      $('#last-id').text(self.lastId);
    };

    const refreshNewImages = function() {
      $('#new-images').text(self.data.length);
    };

    const setStatus = function(status, textClass, glyphClass) {
      $('#status').removeClass().addClass(textClass).text(status);
      $('#status-status').removeClass().addClass(glyphClass);
    };

    const setLastIdStatus = function(status, glyphClass) {
      $('#last-id-status').removeClass().addClass(glyphClass).prop('title', status);
    };

    //------------------- Constructor -------------------
    constructor();
  }

  function App(data, externalData) {
    const self = this;

    const constructor = function(data, externalData) {
      self.data = data;
      self.externalData = externalData;
      self.loading = false;
    };

    // ------------------- Methods -------------------
    this.start = function() {
      if (self.data.isLoaded() && !self.loading) {
        self.loading = true;
        self.data.setStatusBusy('Getting lastId');
        self.data.setLastIdStatusBusy();

        self.externalData.readValue(self.data.token, handleExternalLastIdGot, handleExternalLastIdGetFailed);
      }
    };

    // ------------------- Internal -------------------
    const handleExternalLastIdGot = function(externalLastId) {
      if (externalLastId > self.data.lastId) {
        self.data.setLastId(externalLastId);
        self.data.setLastIdStatusUpdated();
        lastIdUpdated();
      } else if (externalLastId === self.data.lastId) {
        self.data.setLastIdStatusUpToDate();
        lastIdUpdated();
      } else {
        self.data.setStatusBusy('Saving lastId');
        self.externalData.saveValue(self.data.token, self.data.lastId, handleExternalLastIdSaved, handleExternalLastIdSaveFailed);
      }
    };

    const handleExternalLastIdSaved = function() {
      self.data.setLastIdStatusSaved();
      lastIdUpdated();
    };

    const handleExternalLastIdSaveFailed = function() {
      self.data.setLastIdStatusNotSaved();
      lastIdUpdated();
    };

    const handleExternalLastIdGetFailed = function() {
      self.data.setLastIdStatusNotLoaded();
      lastIdUpdated();
    };

    const lastIdUpdated = function() {
      // TODO implement
      self.loading = false;
      self.data.setStatusFinished('Loaded');
    };

    //------------------- Constructor -------------------
    constructor(data, externalData);
  }

  function SettingsView(data, externalData, app) {
    const self = this;

    const constructor = function(data, externalData, app) {
      self.data = data;
      self.externalData = externalData;
      self.app = app;
      self.loaded = false;

      $('#save-settings').click(function() {
        applySettings();
        clearInputs();
        hideSettings();
        self.app.start();
      });

      $('#regenerate-token').click(function() {
        regenerateToken();
      });

      if (!self.data.isLoaded()) {
        showSettings();
      }
    };

    // ------------------- Internal -------------------
    const applySettings = function() {
      self.data.setToken($('#token-input').val());
      self.data.setLastId($('#last-id-input').val());
    };

    const regenerateToken = function() {
      markTokenRegenerationStart();

      self.externalData.generateToken(function(token) {
        $('#token-input').val(token);
        markTokenRegenerationSuccess();
      }, function() {
        markTokenRegenerationFailure();
      });
    };

    // ------------------- View -------------------
    const markTokenRegenerationStart = function() {
      $('#regenerate-token').prop('disabled', true);
      $('#regenerate-token-status').removeClass().addClass('glyphicon glyphicon-time');
    };

    const markTokenRegenerationSuccess = function() {
      $('#regenerate-token-status').removeClass().addClass('glyphicon glyphicon-ok');
      $('#regenerate-token').prop('disabled', false);
    };

    const markTokenRegenerationFailure = function() {
      $('#regenerate-token-status').removeClass().addClass('glyphicon glyphicon-alert');
      $('#regenerate-token').prop('disabled', false);
    };

    const clearInputs = function() {
      $('#token-input').val('');
      $('#last-id-input').val('');
    };

    const hideSettings = function() {
      $('#settings-panel').collapse('hide');
    };

    const showSettings = function() {
      $('#settings-panel').collapse('show');
    };

    //------------------- Constructor -------------------
    constructor(data, externalData, app);
  }


  const data = new Data();
  const externalData = new ExternalData();
  const app = new App(data, externalData);
  const settingsView = new SettingsView(data, externalData, app);

  app.start();

});