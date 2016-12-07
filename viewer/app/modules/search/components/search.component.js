(function() {

  'use strict';

  const hourMS    = 3600000;
  let currentTime = new Date().getTime();

  /**
   * @class SearchController
   * @classdesc Interacts with the search controls
   */
  class SearchController {

    /**
     * Initialize global variables for this controller
     * @param $scope        Angular application model object
     * @param $location     Exposes browser address bar URL (based on the window.location)
     * @param $rootScope    Angular application main scope
     * @param $routeParams  Retrieve the current set of route parameters
     * @param ConfigService Transacts app configurations with the server
     *
     * @ngInject
     */
    constructor($scope, $location, $rootScope, $routeParams, ConfigService) {
      this.$scope         = $scope;
      this.$location      = $location;
      this.$rootScope     = $rootScope;
      this.$routeParams   = $routeParams;
      this.ConfigService  = ConfigService;
    }

    /* Callback when component is mounted and ready */
    $onInit() {
      this.ConfigService.getMolochClusters()
         .then((clusters) => {
           this.molochclusters = clusters;
         });

      this.actionFormItemRadio = 'visible';

      if (this.$routeParams.date) { // time range is available
        this.timeRange = this.$routeParams.date;
        if (this.timeRange === '-1') { // all time
          this.startTime  = hourMS * 5;
          this.stopTime   = currentTime;
        }
        this.$location.search('stopTime', null);
        this.$location.search('startTime', null);
      } else if(this.$routeParams.startTime && this.$routeParams.stopTime) {
        // start and stop times available
        let stop  = parseInt(this.$routeParams.stopTime * 1000, 10);
        let start = parseInt(this.$routeParams.startTime * 1000, 10);
        if (stop && start && !isNaN(stop) && !isNaN(start)) {
          // if we can parse start and stop time, set them
          this.timeRange  = '0'; // custom time range
          this.stopTime   = stop;
          this.startTime  = start;
        } else { // if we can't parse stop or start time, set default
          this.timeRange = '1'; // default to 1 hour
          this.$location.search('date', this.timeRange);
          this.$location.search('stopTime', null);
          this.$location.search('startTime', null);
        }
      } else if (!this.$routeParams.date &&
          !this.$routeParams.startTime && !this.$routeParams.stopTime) {
        // there are no time query parameters, so set defaults
        this.timeRange = '1'; // default to 1 hour
        this.$location.search('date', this.timeRange); // update url params
      }

      if (this.$routeParams.expression) {
        this.expression = { value: this.$routeParams.expression };
      } else { this.expression = { value: null }; }

      this.strictly = false; // default to unbounded results
      if (this.$routeParams.strictly) { this.strictly = true; }

      // date picker popups hidden to start
      this.startTimePopup   = { opened: false };
      this.stopTimePopup    = { opened: false };
      // date picker display format
      this.dateTimeFormat   = 'yyyy/MM/dd HH:mm:ss';
      // other acceptable formats
      this.altInputFormats  = ['yyyy/M!/d! H:mm:ss'];

      this.change();

      // watch for changes in time parameters
      this.$scope.$on('update:time', (event, args) => {
        if (args.start) { // start time changed
          this.startTime  = parseInt(args.start * 1000, 10);
        }
        if (args.stop) {  // stop time changed
          this.stopTime   = parseInt(args.stop * 1000, 10);
        }

        this.changeDate();
      });

      // watch for closing the action form
      this.$scope.$on('close:form:container', (event, args) => {
        this.actionForm = false;
        if (args && args.message) {
          this.message      = args.message;
          this.messageType  = 'success';
        }
      });
    }


    /* exposed functions --------------------------------------------------- */
    /**
     * Fired when the time range value changes
     */
    changeTimeRange() {
      this.$location.search('date', this.timeRange);
      this.$location.search('stopTime', null);
      this.$location.search('startTime', null);

      this.change();
    }

    /**
     * Fired when a date value is changed
     */
     changeDate() {
       this.timeRange = '0'; // custom time range

       let stopSec  = (this.stopTime / 1000).toFixed();
       let startSec = (this.startTime / 1000).toFixed();

       // only continue if start and stop are valid numbers
       if (!startSec || !stopSec || isNaN(startSec) || isNaN(stopSec)) {
         return;
       }

       this.$location.search('date', null);
       this.$location.search('stopTime', (this.stopTime / 1000).toFixed());
       this.$location.search('startTime', (this.startTime / 1000).toFixed());

       this.change();
     }

     /**
      * Fired when change bounded checkbox is (un)checked
      */
     changeBounded() {
       this.strictly = !this.strictly;

       if (this.strictly) {
         this.$location.search('strictly', 'true');
       } else {
         this.$location.search('strictly', null);
       }

       this.change();
     }

    /**
     * Fired when a search control value is changed
     * (startTime, stopTime, timeRange, expression, strictly)
     */
    change() {
      let useDateRange = false;

      // update the parameters with the expression
      if (this.expression.value && this.expression.value !== '') {
        this.$location.search('expression', this.expression.value);
      } else {
        this.$location.search('expression', null);
      }

      if (this.timeRange > 0) {
        // if it's not a custom time range or all, update the time
        currentTime = new Date().getTime();

        this.stopTime   = currentTime;
        this.startTime  = currentTime - (hourMS * this.timeRange);
      }

      if (parseInt(this.timeRange) === -1) { // all time
        this.startTime  = hourMS * 5;
        this.stopTime   = currentTime;
        useDateRange    = true;
      }

      // update the displayed time range
      this.deltaTime = this.stopTime - this.startTime;

      // always use startTime and stopTime instead of date range (except for all)
      // querying with date range causes unexpected paging behavior
      // because there are always new sessions
      if (this.startTime && this.stopTime) {
        let args = {
          expression: this.expression.value,
          strictly  : this.strictly
        };

        if (useDateRange) { args.date = -1; }
        else {
          args.startTime  = (this.startTime / 1000).toFixed();
          args.stopTime   = (this.stopTime / 1000).toFixed();
        }

        this.$scope.$emit('change:search', args);

        this.$rootScope.$broadcast('issue:search', {
          expression: this.expression.value
        });
      }
    }


    /* Action Menu Functions ----------------------------------------------- */
    addTags() {
      this.actionForm = 'add:tags';
    }

    removeTags() {
      this.actionForm = 'remove:tags';
    }

    exportPCAP() {
      this.actionForm = 'export:pcap';
    }

    exportCSV() {
      this.actionForm = 'export:csv';
    }

    scrubPCAP() {
      this.actionForm = 'scrub:pcap';
    }

    deleteSession() {
      this.actionForm = 'delete:session';
    }

    sendSession(cluster) {
      this.actionForm = 'send:session';
      this.cluster    = cluster;
    }

  }

  SearchController.$inject = ['$scope','$location','$rootScope','$routeParams',
    'ConfigService'];

  /**
   * Search Component
   * Displays searching controls
   */
  angular.module('directives.search', [])
    .component('molochSearch', {
      template  : require('html!../templates/search.html'),
      controller: SearchController,
      bindings  : {
        openSessions        : '<',
        numVisibleSessions  : '<',
        numMatchingSessions : '<',
        start               : '<'
      }
    });

})();
