(function() {
    var unlocked = false;

    function unlockAudio() {
        if (unlocked) return;
        unlocked = true;

        try {
            var context = WebAudio._context;
            if (context && context.state === "suspended") {
                context.resume();
            }
        } catch (e) {}

        document.removeEventListener("touchstart", unlockAudio);
        document.removeEventListener("click", unlockAudio);
    }

    document.addEventListener("touchstart", unlockAudio);
    document.addEventListener("click", unlockAudio);
})();