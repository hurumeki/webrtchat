(function($){
$(function(){
  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

  window.existingCall = {};
  window.localStream = null;

  var peer = new Peer({
    host: 'webrtchat-peer.herokuapp.com',
    port: "443",
    secure: "true",
    debug: 3,
    config: {'iceServers': [
      { url: 'stun:stun.l.google.com:19302' }
    ]}});

  peer.on('open', function(){
    $('#your-id').val(peer.id);
  });

  peer.on('call', function(call){
    if (!window.localStream) {
      navigator.getUserMedia({audio: true, video: true}, function(stream){
        $('#your-video').prop('src', URL.createObjectURL(stream));
        window.localStream = stream;
        call.answer(window.localStream);
      }, function(){ $('#step1-error').show(); });
    } else {
      call.answer(window.localStream);
    }
    bindCallEvent(call);
    window.existingCall.call = call;
    $('#partner-id').val(call.peer);
  });

  peer.on('connection', function(conn){
    bindConnEvent(conn);
    window.existingCall.conn = conn;
  });

  peer.on('error', function(err){
    alert(err.message);
  });

  /* events */
  $('#partner-id').on('change', function(){
    if (window.existingCall) {
      if (window.existingCall.call) {
        window.existingCall.call.close();
      }
      if (window.existingCall.conn) {
        window.existingCall.conn.close();
      }
    }

    if (!window.localStream) {
      navigator.getUserMedia({audio: true, video: true}, function(stream){
        $('#your-video').prop('src', URL.createObjectURL(stream));
        window.localStream = stream;
        window.existingCall.call = callPartner($('#partner-id').val(), window.localStream);
        window.existingCall.conn = connectPartner($('#partner-id').val());
      }, function(){ $('#step1-error').show(); });
    } else {
      window.existingCall.call = callPartner($('#partner-id').val(), window.localStream);
      window.existingCall.conn = connectPartner($('#partner-id').val());
    }
  });

  /* functions */
  var callPartner = function(remotePeerId, stream) {
    var call = peer.call(remotePeerId, stream);
    bindCallEvent(call);
    return call;
  }

  var connectPartner = function(remotePeerId) {
    var conn = peer.connect(remotePeerId);
    bindConnEvent(conn);
    return conn;
  }

  var bindCallEvent = function(call) {
    call.on('stream', function(stream){
      $('#partner-video').prop('src', URL.createObjectURL(stream));
    });
    call.on('close', function(){console.log("close")});
  }

  var bindConnEvent = function(conn) {
    conn.on('open', function () {
      $(".chat-input").on('keypress', function (e) {
        var data = {type: "send", text: ""};
        if (e.keyCode == 13) {
          data.text = $("#you .chat-input").val();
          if (data.text != "") {
            conn.send(data);
            $("#you .chat").append($("<p>", {text: data.text}))
            $("#partner .chat").append($("<p>"))
            $("#you .chat-input").val("");
          }
        }
      });
      $(".chat-input").on('keyup', function () {
        var data = {type: "change", text: ""};
        data.text = $("#you .chat-input").val();
        if (data.text != "") {
          conn.send(data);
        }
      });
    });
    conn.on('data', function (data) {
      if (data.type) {
        switch (data.type) {
          case "send":
            $("#partner .chat").append($("<p>", {text: data.text}));
            $("#you .chat").append($("<p>"))
            $("#partner .chat-input").val("");
            break;
          case "change":
            $("#partner .chat-input").val(data.text);
            break;
        }
      }
     })
  }

  /* for peer server on heroku */
  var makePeerHeartbeater = function(peer){
  var timeoutId = 0;
  function heartbeat () {
    timeoutId = setTimeout( heartbeat, 20000 );
    if ( peer.socket._wsOpen() ) {
      peer.socket.send( {type:'HEARTBEAT'} );
    }
  }
  heartbeat();
  return {
      start : function () {
        if ( timeoutId === 0 ) { heartbeat(); }
      },
      stop : function () {
        clearTimeout( timeoutId );
        timeoutId = 0;
      }
    };
  };
  makePeerHeartbeater(peer);
})
}(jQuery));

