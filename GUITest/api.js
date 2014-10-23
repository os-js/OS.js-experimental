(function() {

  module.exports.ApplicationTester = {
    call : function(method, args, callback) {
      callback({
        "message": "You called the Application API (backend)",
        "requestMethod": method,
        "requestArguments": args
      });
    }
  };

})();
