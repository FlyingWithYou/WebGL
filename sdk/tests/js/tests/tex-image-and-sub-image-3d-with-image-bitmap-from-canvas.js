/*
** Copyright (c) 2016 The Khronos Group Inc.
**
** Permission is hereby granted, free of charge, to any person obtaining a
** copy of this software and/or associated documentation files (the
** "Materials"), to deal in the Materials without restriction, including
** without limitation the rights to use, copy, modify, merge, publish,
** distribute, sublicense, and/or sell copies of the Materials, and to
** permit persons to whom the Materials are furnished to do so, subject to
** the following conditions:
**
** The above copyright notice and this permission notice shall be included
** in all copies or substantial portions of the Materials.
**
** THE MATERIALS ARE PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
** EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
** MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
** IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
** CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
** TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
** MATERIALS OR THE USE OR OTHER DEALINGS IN THE MATERIALS.
*/

function generateTest(internalFormat, pixelFormat, pixelType, prologue, resourcePath) {
    var wtu = WebGLTestUtils;
    var tiu = TexImageUtils;
    var gl = null;
    var successfullyParsed = false;
    var redColor = [255, 0, 0];
    var greenColor = [0, 255, 0];
    var bitmaps = [];

    function init()
    {
        description('Verify texImage3D and texSubImage3D code paths taking ImageBitmap created from an HTMLCanvasElement (' + internalFormat + '/' + pixelFormat + '/' + pixelType + ')');

        if(!window.createImageBitmap || !window.ImageBitmap) {
            finishTest();
            return;
        }

        gl = wtu.create3DContext("example");

        if (!prologue(gl)) {
            finishTest();
            return;
        }

        switch (gl[pixelFormat]) {
          case gl.RED:
          case gl.RED_INTEGER:
            greenColor = [0, 0, 0];
            break;
          default:
            break;
        }

        gl.clearColor(0,0,0,1);
        gl.clearDepth(1);

        var testCanvas = document.createElement('canvas');
        var ctx = testCanvas.getContext("2d");
        setCanvasToMin(ctx);
        var p1 = createImageBitmap(testCanvas).then(function(imageBitmap) { bitmaps.minDefaultOption = imageBitmap });
        var p2 = createImageBitmap(testCanvas, {imageOrientation: "none"}).then(function(imageBitmap) { bitmaps.minNoFlipY = imageBitmap });
        var p3 = createImageBitmap(testCanvas, {imageOrientation: "flipY"}).then(function(imageBitmap) { bitmaps.minFlipY = imageBitmap });
        setCanvasTo257x257(ctx);
        var p4 = createImageBitmap(testCanvas).then(function(imageBitmap) { bitmaps.bigDefaultOption = imageBitmap });
        var p5 = createImageBitmap(testCanvas, {imageOrientation: "none"}).then(function(imageBitmap) { bitmaps.bigNoFlipY = imageBitmap });
        var p6 = createImageBitmap(testCanvas, {imageOrientation: "flipY"}).then(function(imageBitmap) { bitmaps.bigFlipY = imageBitmap });
        Promise.all([p1, p2, p3, p4, p5, p6]).then(function() {
            runTest();
        }, function() {
            // createImageBitmap with options could be rejected if it is not supported
            finishTest();
            return;
        });
    }

    function setCanvasToRedGreen(ctx) {
        var width = ctx.canvas.width;
        var height = ctx.canvas.height;
        var halfHeight = Math.floor(height / 2);
        ctx.fillStyle = "#ff0000";
        ctx.fillRect(0, 0, width, halfHeight);
        ctx.fillStyle = "#00ff00";
        ctx.fillRect(0, halfHeight, width, height - halfHeight);
    }

    function setCanvasToMin(ctx) {
        ctx.canvas.width = 2;
        ctx.canvas.height = 2;
        setCanvasToRedGreen(ctx);
    }

    function setCanvasTo257x257(ctx) {
        ctx.canvas.width = 257;
        ctx.canvas.height = 257;
        setCanvasToRedGreen(ctx);
    }

    function runOneIteration(bindingTarget, program, bitmap, flipY)
    {
        debug('Testing ' + ', bindingTarget=' + (bindingTarget == gl.TEXTURE_3D ? 'TEXTURE_3D' : 'TEXTURE_2D_ARRAY'));
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        // Enable writes to the RGBA channels
        //gl.colorMask(1, 1, 1, 0);
        var texture = gl.createTexture();
        // Bind the texture to texture unit 0
        gl.bindTexture(bindingTarget, texture);
        // Set up texture parameters
        gl.texParameteri(bindingTarget, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(bindingTarget, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(bindingTarget, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(bindingTarget, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // Upload the image into the texture
        gl.texImage3D(bindingTarget, 0, gl[internalFormat], bitmap.width, bitmap.height, 1 /* depth */, 0,
                      gl[pixelFormat], gl[pixelType], null);
        gl.texSubImage3D(bindingTarget, 0, 0, 0, 0, gl[pixelFormat], gl[pixelType], bitmap);

        var width = gl.canvas.width;
        var height = gl.canvas.height;
        var halfHeight = Math.floor(height / 2);
        var top = flipY ? 0 : (height - halfHeight);
        var bottom = flipY ? (height - halfHeight) : 0;

        // Draw the triangles
        wtu.clearAndDrawUnitQuad(gl, [0, 0, 0, 255]);

        // Check the top pixel and bottom pixel and make sure they have
        // the right color.
        debug("Checking " + (flipY ? "top" : "bottom"));
        wtu.checkCanvasRect(gl, 0, bottom, width, halfHeight, redColor, "shouldBe " + redColor);
        debug("Checking " + (flipY ? "bottom" : "top"));
        wtu.checkCanvasRect(gl, 0, top, width, halfHeight, greenColor, "shouldBe " + greenColor);
    }

    function runTest()
    {
        var program = tiu.setupTexturedQuadWith3D(gl, internalFormat);
        runTestOnBindingTarget(gl.TEXTURE_3D, program);
        program = tiu.setupTexturedQuadWith2DArray(gl, internalFormat);
        runTestOnBindingTarget(gl.TEXTURE_2D_ARRAY, program);

        wtu.glErrorShouldBe(gl, gl.NO_ERROR, "should be no errors");
        finishTest();
    }

    function runTestOnBindingTarget(bindingTarget, program) {
        runOneIteration(bindingTarget, program, bitmaps.minDefaultOption, false);
        runOneIteration(bindingTarget, program, bitmaps.minNoFlipY, false);
        runOneIteration(bindingTarget, program, bitmaps.minFlipY, true);
        runOneIteration(bindingTarget, program, bitmaps.bigDefaultOption, false);
        runOneIteration(bindingTarget, program, bitmaps.bigNoFlipY, false);
        runOneIteration(bindingTarget, program, bitmaps.bigFlipY, true);
    }

    return init;
}