'use strict';

let gl;
let surface;
let shProgram;
let spaceball;
let zoomDistance = 10;
let animationRequestId = null;

// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    this.iAttribNormal = -1;
    this.iAttribTexCoord = -1;
    this.iAttribTangent = -1;
    // Location of the uniform specifying a color for the primitive.
    this.iColor = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;

    this.iModelViewMatrix = -1;
    this.iNormalMatrix = -1;
    this.iLightPosition = -1;

    this.iDiffuseMap = -1;
    this.iSpecularMap = -1;
    this.iNormalMap = -1;

    this.Use = function() {
        gl.useProgram(this.prog);
    }
}


let diffuseTexture = null;
let specularTexture = null;
let normalTexture = null;


function draw(timeMs) { 
    gl.clearColor(0,0,0,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    let projection = m4.perspective(Math.PI/8, 1, 0.1, 100); 
    
    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707,0.707,0], 0.7);
    let translateToPointZero = m4.translation(0,0,-zoomDistance);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView );
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0 );
        
    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, matAccum1 );

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection );
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccum1 );

    const mvInv = m4.inverse(matAccum1);
    const mvInvT = m4.transpose(mvInv);
    const normalMatrix = new Float32Array([
        mvInvT[0], mvInvT[1], mvInvT[2],
        mvInvT[4], mvInvT[5], mvInvT[6],
        mvInvT[8], mvInvT[9], mvInvT[10],
    ]);
    gl.uniformMatrix3fv(shProgram.iNormalMatrix, false, normalMatrix);

    const t = (timeMs !== undefined ? timeMs : performance.now()) * 0.001;
    const lightRadius = 8.0;
    const lightHeight = 2.5;
    const lightWorld = [lightRadius * Math.cos(t), lightHeight, lightRadius * Math.sin(t)];
    const lightView = m4.transformPoint(matAccum1, lightWorld);
    gl.uniform3fv(shProgram.iLightPosition, lightView);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, diffuseTexture);
    gl.uniform1i(shProgram.iDiffuseMap, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, specularTexture);
    gl.uniform1i(shProgram.iSpecularMap, 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, normalTexture);
    gl.uniform1i(shProgram.iNormalMap, 2);
    
    gl.uniform4fv(shProgram.iColor, [0.2, 0.7, 1.0, 1.0]);
    surface.drawTriangles();
}

/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram( gl, vertexShaderSource, fragmentShaderSource );

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex              = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribNormal              = gl.getAttribLocation(prog, "normal");
    shProgram.iAttribTexCoord            = gl.getAttribLocation(prog, "texCoord");
    shProgram.iAttribTangent             = gl.getAttribLocation(prog, "tangent");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iModelViewMatrix           = gl.getUniformLocation(prog, "ModelViewMatrix");
    shProgram.iNormalMatrix              = gl.getUniformLocation(prog, "NormalMatrix");
    shProgram.iLightPosition             = gl.getUniformLocation(prog, "LightPosition");
    shProgram.iColor                     = gl.getUniformLocation(prog, "color");

    shProgram.iDiffuseMap                = gl.getUniformLocation(prog, "DiffuseMap");
    shProgram.iSpecularMap               = gl.getUniformLocation(prog, "SpecularMap");
    shProgram.iNormalMap                 = gl.getUniformLocation(prog, "NormalMap");

    diffuseTexture = LoadTexture('./diffuse.jpg', new Uint8Array([255, 255, 255, 255]));
    specularTexture = LoadTexture('./specular.jpg', new Uint8Array([255, 255, 255, 255]));
    normalTexture = LoadTexture('./normal.jpg', new Uint8Array([128, 128, 255, 255]));

    surface = new SurfaceGrid(64, 32);

    gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader( gl.VERTEX_SHADER );
    gl.shaderSource(vsh,vShader);
    gl.compileShader(vsh);
    if ( ! gl.getShaderParameter(vsh, gl.COMPILE_STATUS) ) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
     }
    let fsh = gl.createShader( gl.FRAGMENT_SHADER );
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if ( ! gl.getShaderParameter(fsh, gl.COMPILE_STATUS) ) {
       throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog,vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if ( ! gl.getProgramParameter( prog, gl.LINK_STATUS) ) {
       throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if ( ! gl ) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    const nuSlider = document.getElementById('nuSlider');
    const nvSlider = document.getElementById('nvSlider');
    const zoomSlider = document.getElementById('zoomSlider');
    const nuValue = document.getElementById('nuValue');
    const nvValue = document.getElementById('nvValue');
    const zoomValue = document.getElementById('zoomValue');
    
    if (nuSlider && nvSlider) {
        nuSlider.addEventListener('input', function() {
            const nu = parseInt(nuSlider.value);
            const nv = parseInt(nvSlider.value);
            nuValue.textContent = nu;
            surface.updateGrid(nu, nv);
            draw();
        });
        
        nvSlider.addEventListener('input', function() {
            const nu = parseInt(nuSlider.value);
            const nv = parseInt(nvSlider.value);
            nvValue.textContent = nv;
            surface.updateGrid(nu, nv);
            draw();
        });
    }
    
    if (zoomSlider) {
        zoomSlider.addEventListener('input', function() {
            zoomDistance = parseFloat(zoomSlider.value);
            zoomValue.textContent = zoomDistance.toFixed(1);
            draw();
        });
    }

    if (animationRequestId !== null) {
        cancelAnimationFrame(animationRequestId);
    }
    const animate = function(timeMs) {
        draw(timeMs);
        animationRequestId = requestAnimationFrame(animate);
    };
    animationRequestId = requestAnimationFrame(animate);
}