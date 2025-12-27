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

    this.positionBuffer = null;
    this.normalBuffer = null;
    this.indexBuffer = null;
    this.indexCount = 0;

    function vec3Sub(a, b) {
        return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    }

    function vec3Cross(a, b) {
        return [
            a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0]
        ];
    }

    function vec3Dot(a, b) {
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    }

    function vec3Length(a) {
        return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
    }

    function vec3Normalize(a) {
        const len = vec3Length(a);
        if (len > 1e-8) {
            return [a[0] / len, a[1] / len, a[2] / len];
        }
        return [0, 0, 0];
    }

    function clamp(x, min, max) {
        return Math.max(min, Math.min(max, x));
    }

    function angleBetween(u, v) {
        const un = vec3Normalize(u);
        const vn = vec3Normalize(v);
        const d = clamp(vec3Dot(un, vn), -1, 1);
        return Math.acos(d);
    }

    this.generate = function() {
        const twoPi = 2 * Math.PI;

        const positions = [];
        const normalsAccum = [];

        const vertCountU = this.nu + 1;
        const vertCountV = this.nv + 1;
        const vertCount = vertCountU * vertCountV;

        for (let i = 0; i < vertCount; i++) {
            normalsAccum.push([0, 0, 0]);
        }

        for (let iv = 0; iv <= this.nv; iv++) {
            const v = (iv / this.nv) * twoPi;
            for (let iu = 0; iu <= this.nu; iu++) {
                const u = (iu / this.nu) * twoPi;
                const p = klein(u, v);
                positions.push(p[0], p[1], p[2]);
            }
        }

        const indices = [];
        for (let iv = 0; iv < this.nv; iv++) {
            for (let iu = 0; iu < this.nu; iu++) {
                const a = iv * vertCountU + iu;
                const b = a + 1;
                const c = (iv + 1) * vertCountU + iu;
                const d = c + 1;
                indices.push(a, c, b);
                indices.push(b, c, d);
            }
        }

        for (let i = 0; i < indices.length; i += 3) {
            const ia = indices[i + 0];
            const ib = indices[i + 1];
            const ic = indices[i + 2];

            const pa = [positions[ia * 3 + 0], positions[ia * 3 + 1], positions[ia * 3 + 2]];
            const pb = [positions[ib * 3 + 0], positions[ib * 3 + 1], positions[ib * 3 + 2]];
            const pc = [positions[ic * 3 + 0], positions[ic * 3 + 1], positions[ic * 3 + 2]];

            const e1 = vec3Sub(pb, pa);
            const e2 = vec3Sub(pc, pa);
            const faceN = vec3Normalize(vec3Cross(e1, e2));

            const angleA = angleBetween(vec3Sub(pb, pa), vec3Sub(pc, pa));
            const angleB = angleBetween(vec3Sub(pa, pb), vec3Sub(pc, pb));
            const angleC = angleBetween(vec3Sub(pa, pc), vec3Sub(pb, pc));

            normalsAccum[ia][0] += faceN[0] * angleA;
            normalsAccum[ia][1] += faceN[1] * angleA;
            normalsAccum[ia][2] += faceN[2] * angleA;

            normalsAccum[ib][0] += faceN[0] * angleB;
            normalsAccum[ib][1] += faceN[1] * angleB;
            normalsAccum[ib][2] += faceN[2] * angleB;

            normalsAccum[ic][0] += faceN[0] * angleC;
            normalsAccum[ic][1] += faceN[1] * angleC;
            normalsAccum[ic][2] += faceN[2] * angleC;
        }

        const normals = [];
        for (let i = 0; i < normalsAccum.length; i++) {
            const n = vec3Normalize(normalsAccum[i]);
            normals.push(n[0], n[1], n[2]);
        }

        if (this.positionBuffer) {
            gl.deleteBuffer(this.positionBuffer);
        }
        if (this.normalBuffer) {
            gl.deleteBuffer(this.normalBuffer);
        }
        if (this.indexBuffer) {
            gl.deleteBuffer(this.indexBuffer);
        }

        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        this.normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

        this.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
        this.indexCount = indices.length;
    };

    this.drawTriangles = function() {
        if (!this.positionBuffer || !this.normalBuffer || !this.indexBuffer || this.indexCount === 0) {
            return;
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.vertexAttribPointer(shProgram.iAttribNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribNormal);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
    };
    
    this.updateGrid = function(nu, nv) {
        this.nu = nu;
        this.nv = nv;
        this.generate();
    };

    this.generate();
}
