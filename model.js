'use strict';

function klein(u, v, a = 2) {
    const cos_u2 = Math.cos(u / 2);
    const sin_u2 = Math.sin(u / 2);
    const cos_u = Math.cos(u);
    const sin_u = Math.sin(u);
    const sin_v = Math.sin(v);
    const sin_2v = Math.sin(2 * v);
    
    const r = a + cos_u2 * sin_v - sin_u2 * sin_2v;
    
    const x = r * cos_u;
    const y = r * sin_u;
    const z = sin_u2 * sin_v + cos_u2 * sin_2v;
    
    return [x, y, z];
}

function SurfaceGrid(nu, nv) {
    this.nu = nu || 64;
    this.nv = nv || 32;
    
    this.uBuffer = null;
    this.uCounts = [];
    this.uOffsets = [];
    
    this.vBuffer = null;
    this.vCounts = [];
    this.vOffsets = [];
    
    this.generate = function() {
        const uVertices = [];
        const vVertices = [];
        
        const twoPi = 2 * Math.PI;
        
        this.uCounts = [];
        this.uOffsets = [];
        let uOffset = 0;
        
        for (let iv = 0; iv <= this.nv; iv++) {
            const v = (iv / this.nv) * twoPi;
            
            for (let iu = 0; iu <= this.nu; iu++) {
                const u = (iu / this.nu) * twoPi;
                const point = klein(u, v);
                uVertices.push(point[0], point[1], point[2]);
            }
            
            const count = this.nu + 1;
            this.uCounts.push(count);
            this.uOffsets.push(uOffset);
            uOffset += count;
        }
        
        this.vCounts = [];
        this.vOffsets = [];
        let vOffset = 0;
        
        for (let iu = 0; iu <= this.nu; iu++) {
            const u = (iu / this.nu) * twoPi;
            
            for (let iv = 0; iv <= this.nv; iv++) {
                const v = (iv / this.nv) * twoPi;
                const point = klein(u, v);
                vVertices.push(point[0], point[1], point[2]);
            }
            
            const count = this.nv + 1;
            this.vCounts.push(count);
            this.vOffsets.push(vOffset);
            vOffset += count;
        }
        
        if (this.uBuffer) {
            gl.deleteBuffer(this.uBuffer);
        }
        if (this.vBuffer) {
            gl.deleteBuffer(this.vBuffer);
        }
        
        this.uBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uVertices), gl.STATIC_DRAW);
        
        this.vBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vVertices), gl.STATIC_DRAW);
    };
    
    this.drawULines = function() {
        if (!this.uBuffer || this.uCounts.length === 0) {
            return;
        }
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);
        
        for (let i = 0; i < this.uCounts.length; i++) {
            const offset = this.uOffsets[i];
            const count = this.uCounts[i];
            gl.drawArrays(gl.LINE_STRIP, offset, count);
        }
    };
    
    this.drawVLines = function() {
        if (!this.vBuffer || this.vCounts.length === 0) {
            return;
        }
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);
        
        for (let i = 0; i < this.vCounts.length; i++) {
            const offset = this.vOffsets[i];
            const count = this.vCounts[i];
            gl.drawArrays(gl.LINE_STRIP, offset, count);
        }
    };
    
    this.updateGrid = function(nu, nv) {
        this.nu = nu;
        this.nv = nv;
        this.generate();
    };
    
    this.generate();
}
