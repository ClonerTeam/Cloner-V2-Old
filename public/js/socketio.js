$(function () {
    var socket = io();

    socket.on('news', function(data){
      console.log('yeah ' + data );
    });
});