'use strict';
/**
 * Based On:
 *
 * Bonita AngularJS Portal demo
 * Author: Philippe Ozil
 * Project page: https://github.com/pozil/bonita-angular-oortal
 */

(function() {

var appModule = angular.module('angularPortal', ['ui.bootstrap', 'ngBonita']);

appModule.config(function (bonitaConfigProvider) {
    bonitaConfigProvider.setBonitaUrl('/bonita');
});

appModule.constant('APP_CONFIG', {
	//Resource base path (integration into Bonita custom pages)
	'RESOURCE_PATH' : '',
	//Max page size for listings in UI
	'UI_PAGE_SIZE' : 10,
});

appModule.controller('PortalController', 
	['$scope', 'bonitaAuthentication',
	function ($scope, bonitaAuthentication) {
	
	var appCtrl = this;
	
	$scope.login = function(username, password, fnCallback) {
		bonitaAuthentication.login(username, password).then(function() {
			fnCallback(true);
		}, function() {
			fnCallback(false);
		});
	};
	
	$scope.logout = function() {
		bonitaAuthentication.logout();
	};
	
	$scope.isLogged = function() {
		return bonitaAuthentication.isLogged;
	};
	
	// Check for active session in case of page refresh
	bonitaAuthentication.checkForActiveSession();
}]);


// Home page controller
appModule.controller('HomeController', ['$scope', 'bonitaConfig', function($scope, bonitaConfig) {
	
	$scope.getUsername = function () {
		return bonitaConfig.getUsername();
	};
	
}]);

appModule.filter('dateString', function() {
	return function(input) {
		 return input.substring(0, input.lastIndexOf('.'));
	};
});


// Process definition list controller
appModule.controller('ProcessDefinitionListController', 
	['$scope', '$sce', '$modal', 'bonitaConfig', 'bonitaAuthentication', 'ProcessDefinition', 
	function($scope, $sce, $modal, bonitaConfig, bonitaAuthentication, ProcessDefinition) {
	
	this.procDefs = null;
	var controller = this;
	
	this.refresh = function() {
		controller.procDefs = ProcessDefinition.getStartableByCurrentUser();
	};
	
	this.getCount = function() {
		if (controller.procDefs == null)
			return "-";
		else
			return controller.procDefs.totalCount;
	};
	
	// Opens a modal dialog displaying a Bonita case start form in an iFrame
	$scope.openBonitaCaseStartForm = function (procDef) {
		var dialog = $modal.open({
			templateUrl: 'directives/modal/bonitaForm.html',
			controller:  ['$scope', '$modalInstance', '$sce', 'bonitaConfig', function ($scope, $modalInstance, $sce, bonitaConfig) {
				$scope.cancel = function () {
					$modalInstance.dismiss('cancel');
				};
				$scope.getUrl = function () {
					return $sce.trustAsResourceUrl(bonitaConfig.getBonitaUrl() + '/portal/homepage?ui=form&locale=en&tenant=1#form=' 
						+ procDef.displayName + '--' + procDef.version + '$entry&process=' + procDef.id + '&autoInstantiate=false&mode=form');
				};
			}],
			size: 'lg'
		});
		dialog.result.finally(function() {
			// Broadcast refresh signal to listing
			$scope.$broadcast('refresh_list');
		});
	};
	
	// Init data when we acquire user session
	$scope.$watch(
		function () { return bonitaAuthentication.isLogged; },
		function (newValue, oldValue) {
			if (newValue === true)
				controller.refresh();
		}
	);
}]);


// Task list controller
appModule.controller('TaskListController',
	['$scope', '$sce', '$modal', 'bonitaConfig', 'bonitaAuthentication', 'HumanTask', 'APP_CONFIG',
	function($scope, $sce, $modal, bonitaConfig, bonitaAuthentication, HumanTask, APP_CONFIG){
	
	this.list = {items : [], pageIndex : 0, pageSize : 0, totalCount : 0};
	this.archivedTasks = null;
	
	var controller = this;
	
	this.refresh = function(forceDataRefresh) {
		if(!forceDataRefresh)
			return;
		HumanTask.getFromCurrentUser({p: 0, c: 100, d : 'processId'}).$promise.then(function(result){
			for(var i=0; i < result.items.length; i++){
				result.items[i].procDefName = result.items[i].rootContainerId.displayName;
			}
			controller.list = result;
		});
	};

	this.getTaskCount = function() {
		return (controller.list == null) ? "-" : controller.list.totalCount;
	};
	
	$scope.getPriorityIconClass = function(priority) {
		if (priority == 'highest')
			return {'glyphicon glyphicon-chevron-up priority-highest':true};
		if (priority == 'lowest')
			return {'glyphicon glyphicon-chevron-down priority-lowest':true};
		return {'glyphicon glyphicon-minus priority-normal':true};
	};

	this.getNumCor = function(name){
		return name.substring(0, name.lastIndexOf("-"));
	};

	this.getTaskName = function(name){
		return name.substring(name.lastIndexOf("-")+1);
	};

	this.numPages = function(){
		return Math.ceil(controller.list.items.length / 10);
	};
	
	// Opens a modal dialog displaying a Bonita task form in an iFrame
	$scope.openBonitaTaskForm = function(task) {
		var dialog = $modal.open({
			templateUrl: 'directives/modal/bonitaForm.html',
			controller:  ['$scope', '$modalInstance', '$sce', 'bonitaConfig', function ($scope, $modalInstance, $sce, bonitaConfig) {
				$scope.cancel = function () {
					$modalInstance.dismiss('cancel');
				};
				$scope.getUrl = function () {
					return $sce.trustAsResourceUrl(bonitaConfig.getBonitaUrl() + '/portal/homepage?ui=form&locale=en&tenant=1#form=' 
						+ task.processId.displayName + '--' + task.processId.version + '--' + task.displayName +'$entry&task=' + task.id + '&mode=form&assignTask=true');
				};
			}],
			size: 'lg'
		});
		dialog.result.finally(function() {
			// Broadcast refresh signal to listing
			$scope.$broadcast('refresh_list');
		});
	};
	
	// Init data when we acquire user session
	$scope.$watch(
		function () { return bonitaAuthentication.isLogged; },
		function (newValue, oldValue) {
			if (newValue === true)
				controller.refresh(true);
		}
	);
	
	// Global refresh signal listener
	$scope.$on('refresh_list', function(event) {
		controller.refresh();
	});

	//Client side common pagination methods
	this.hasPreviousPage = function() {	return hasPreviousPage(controller)	};
	this.hasNextPage = function()	{	return hasNextPage(controller, APP_CONFIG)	};
	this.showPreviousPage = function()	{	showPreviousPage(controller)	};
	this.showNextPage = function()	{	showNextPage(controller)	};
	this.getItems = function()	{	return getItems(controller, APP_CONFIG)	};
	this.getCountLabel = function()	{ 	return getCountLabel(controller, APP_CONFIG)}

}]);


/*
* COMMON PAGINATION METHODS
*/

function hasPreviousPage(controller){
	return controller.list.pageIndex > 0;
};

function hasNextPage(controller, APP_CONFIG){
	var startIndex = controller.list.pageIndex * APP_CONFIG.UI_PAGE_SIZE;
	var endIndex = startIndex + APP_CONFIG.UI_PAGE_SIZE;
	if(endIndex > controller.list.totalCount)
			endIndex = controller.list.totalCount;
	return endIndex < controller.list.totalCount;
};

function showPreviousPage(controller){
	controller.list.pageIndex --;
	controller.refresh(false);
};

function showNextPage(controller){
	controller.list.pageIndex ++;
	controller.refresh(false);
};

function getItems(controller, APP_CONFIG){
	var startIndex = controller.list.pageIndex * APP_CONFIG.UI_PAGE_SIZE;
	return controller.list.items.slice(startIndex, startIndex + APP_CONFIG.UI_PAGE_SIZE);
};

function getCountLabel(controller, APP_CONFIG){
	if(!controller.list.items)
		return '';
	if(controller.list.totalCount === 0)
		return '';

	var startIndex = controller.list.pageIndex * APP_CONFIG.UI_PAGE_SIZE;
	var endIndex = startIndex + APP_CONFIG.UI_PAGE_SIZE;
	if (endIndex > controller.list.totalCount)
		endIndex = controller.list.totalCount;
	return 'Mostrando  '+ (startIndex+1) +' a '+ endIndex +' de '+ controller.list.totalCount;

};


/*
* DIRECTIVES
*/

// Home screen
appModule.directive("home", function() {
	return {
		restrict: 'E',
		templateUrl: 'directives/home.html'
	};
});

// Task lists
appModule.directive("humanTaskList", function() {
	return {
		restrict: 'E',
		templateUrl: 'directives/humanTaskList.html'
	};
});

//Pagination controls
appModule.directive("paginatorContainer", ['APP_CONFIG', function (APP_CONFIG) {
	return {
		restrict: 'E',
		templateUrl: 'directives/humanTaskList.html'
	};
}])

})();