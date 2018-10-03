/*jshint esversion: 6 */

// TODO wrap in jquery load

function Data() {
  'use strict';
  const self = this;

  const constructor = function() {
    self.status = 'Starting';
    loadData();

    refreshStatusView();
  };

  // ------------------- Methods -------------------
  this.setToken = function(token) {
    self.token = token;
    localStorage.setItem('token', token);
    refreshToken();
  };

  this.setLastId = function(lastId) {
    self.lastId = lastId;
    localStorage.setItem('lastId', lastId);
    refreshLastId();
  };

  this.isLoaded = function() {
    return self.lastId && self.token;
  };

  // TODO Move to ExternalData class. Token should not be automatically saved
  this.regenerateToken = function() {
    return $.post('https://api.keyvalue.xyz/new/lastId', function(data) {
      // TODO extract token from data
      self.setToken(data);
    });
  };

  // ------------------- Internal -------------------
  const loadData = function() {
    self.token = localStorage.getItem('token');
    self.lastId = localStorage.getItem('lastId');
    self.data = localStorage.getItem('data') || [];
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

  const refreshStatus = function() {
    $('#status').text(self.status);
  };

  const refreshStatusView = function() {
    refreshToken();
    refreshLastId();
    refreshNewImages();
    refreshStatus();
  };

  //------------------- Constructor -------------------
  constructor();
}

function App(data) {
  'use strict';
  const self = this;

  const constructor = function(data) {
    self.data = data;
    self.loaded = false;
  };

  // ------------------- Methods -------------------
  this.start = function() {
    if (self.data.isLoaded() && !self.loaded) {
      self.loaded = true;
      // TODO start logic
    }
  };

  //------------------- Constructor -------------------
  constructor(data);
}

function SettingsView(data, app) {
  'use strict';
  const self = this;

  const constructor = function(data, app) {
    self.data = data;
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

  // TODO button for cache??
  const regenerateToken = function() {
    markTokenRegenerationStart();

    self.data.regenerateToken()
      .done(function() {
        $('#token-input').val(self.data.token);
        markTokenRegenerationSuccess();
      })
      .fail(function() {
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
  constructor(data, app);
}

const data = new Data();
const app = new App(data);
const settingsView = new SettingsView(data, app);

app.start();
