

"use strict";

(function () {

    function main()
    {
        let coverElement = document.querySelector(".cover");
        let program = new Program(coverElement);
        program.loadShaderPrograms().then(() => program.start());
    }

    class Program
    {
        constructor(coverElement)
        {
            this.coverElement = coverElement;
            this.shaders = new ShaderCollection();
            this.mouse = {x: 0, y: 0};
            this.renderEnabled = true;

            this.aspect = coverElement.clientWidth / coverElement.clientHeight;

            this.renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
            this.renderer.setSize(coverElement.clientWidth, coverElement.clientHeight);
            coverElement.appendChild(this.renderer.domElement);

            this.scene = new THREE.Scene();
            this.camera = new THREE.OrthographicCamera(-0.5 * this.aspect, 0.5 * this.aspect, -0.5, 0.5, 1, 1000);
            this.camera.position.z = 10;
            this.scene.add(this.camera);

            this.network = null;
        }

        start()
        {
            this.network = new Network(20, 20, this);
            this.scene.add(this.network.pointMesh);
            this.scene.add(this.network.lineMesh);
            this.scene.add(this.network.faceMesh);
            this.trackMouse();
            this.trackWindowSize();
            this.render();
        }

        trackMouse()
        {
            window.addEventListener("mousemove", (e) => {
                this.mouse.x = (e.clientX / this.renderer.getSize().width - 0.5) * this.aspect;
                this.mouse.y = e.clientY / this.renderer.getSize().height - 0.5;
            });
        }

        trackWindowSize()
        {
            window.addEventListener("resize", (e) => {
                this.renderer.setSize(this.coverElement.clientWidth, this.coverElement.clientHeight);
                this.aspect = this.coverElement.clientWidth / this.coverElement.clientHeight;
                this.camera.bottom = 0.5;
                this.camera.top = -0.5;
                this.camera.left = -0.5 * this.aspect;
                this.camera.right = 0.5 * this.aspect;
                this.camera.updateProjectionMatrix();
            });
        }

        loadShaderPrograms()
        {
            return this.shaders.loadFromFiles(
                "network.compute.glsl",
                "network.points.vert",
                "network.points.frag",
                "network.lines.vert",
                "network.lines.frag",
                "network.faces.vert",
                "network.faces.frag"
            );
        }

        render()
        {
            if (this.renderEnabled)
            {
                requestAnimationFrame(() => this.render());
                this.network.compute();
                this.renderer.render(this.scene, this.camera);
            }
        }
    }

    class Network
    {
        constructor(width, height, program)
        {
            width = width || 10;
            height = height || 10;
            let points = width * height;
            this.program = program;
            this.nodes = [];
            this.lines = [];
            this.faces = [];
            this.pointGeometry = null;
            this.lineGeometry = null;
            this.faceGeometry = null;
            
            this.nodes = this.generateNodes(width, height);
            this.lines = this.generateLines(width, height, this.nodes);
            this.faces = this.generateFaces(width, height, this.nodes);

            this.shaderUniforms = {
                u_mouse: {type: "vector3", value: new THREE.Vector3(0, 0, 0)},
                u_time: {type: "float", value: 0.0},
                u_blow: {type: "float", value: 0.0}
            };

            this.pointGeometry = this.buildPointGeometry(this.nodes);
            this.pointMaterial = new THREE.ShaderMaterial({
                vertexShader: this.program.shaders.get("network.points.vert"),
                fragmentShader: this.program.shaders.get("network.points.frag"),
                transparent: true, 
                blending: THREE.AdditiveBlending,
                depthTest: false, 
                uniforms: this.shaderUniforms
            });

            this.lineGeometry = this.buildLineGeometry(this.lines);
            this.lineMaterial = new THREE.ShaderMaterial({
                vertexShader: this.program.shaders.get("network.lines.vert"),
                fragmentShader: this.program.shaders.get("network.lines.frag"),
                transparent: true, 
                blending: THREE.AdditiveBlending,
                depthTest: false, 
                uniforms: this.shaderUniforms
            });

            this.faceGeometry = this.buildFaceGeometry(this.faces);
            this.faceNaterial = new THREE.ShaderMaterial({
                vertexShader: this.program.shaders.get("network.faces.vert"),
                fragmentShader: this.program.shaders.get("network.faces.frag"),
                transparent: true, 
                blending: THREE.AdditiveBlending,
                depthTest: false,
                side: THREE.DoubleSide, 
                uniforms: this.shaderUniforms
            });

            this.pointMesh = new THREE.Points(this.pointGeometry, this.pointMaterial);
            this.lineMesh = new THREE.LineSegments(this.lineGeometry, this.lineMaterial);
            this.faceMesh = new THREE.Mesh(this.faceGeometry, this.faceNaterial);
        }

        compute()
        {

            this.shaderUniforms.u_mouse.value.x = this.program.mouse.x;
            this.shaderUniforms.u_mouse.value.y = this.program.mouse.y;
            this.shaderUniforms.u_time.value += 0.016;

            this.shaderUniforms.needsUpdate = true;
        }

        generateNodes(width, height)
        {
            let nodes = [];
            for (let y = 0; y <= height; y++)
            {
                for (let x = 0; x <= width; x++)
                {
                    let rx = x + Math.random() * 0.7 - 0.35;
                    let ry = y + Math.random() * 0.7 - 0.35;
                    nodes.push(new Node(rx / width - 0.5, ry / height - 0.5, Math.random()));
                }
            }

            return nodes;
        }

        generateLines(width, height, nodes)
        {
            let lines = [];
            let w = width + 1;
            for (let y = 0; y < height; y++)
            {
                for (let x = 0; x < width; x++)
                {
                    let nodeA = nodes[y * w + x];
                    let nodeB = nodes[y * w + x + 1];
                    lines.push(new Line(nodeA, nodeB));

                    nodeA = nodes[y * w + x];
                    nodeB = nodes[(y + 1) * w + x];
                    lines.push(new Line(nodeA, nodeB));
                }
            }
            
            for (let y = 0; y < height; y++)
            {
                let nodeA = nodes[y * w + width];
                let nodeB = nodes[(y + 1) * w + width];
                lines.push(new Line(nodeA, nodeB));
            }

            for (let x = 0; x < width; x++)
            {
                let nodeA = nodes[height * w + x];
                let nodeB = nodes[height * w + x + 1];
                lines.push(new Line(nodeA, nodeB));
            }

            return lines;
        }

        generateFaces(width, height, nodes)
        {
            let faces = [];
            let w = width + 1;
            for (let y = 0; y < height; y++)
            {
                for (let x = 0; x < width; x++)
                {
                    let nodeA = nodes[y * w + x];
                    let nodeB = nodes[y * w + x + 1];
                    let nodeC = nodes[(y + 1) * w + x + 1];
                    let nodeD = nodes[(y + 1) * w + x];
                    faces.push(new Face(nodeA, nodeB, nodeC, nodeD));
                }
            }

            return faces;
        }

        buildPointGeometry(nodes)
        {
            let nodeGeometry = new THREE.BufferGeometry();
            let nodeVertices = new Float32Array(nodes.length * 3);
            let i = 0;
            let v = 0;
            while (i < nodes.length)
            {
                nodeVertices[v++] = nodes[i].position.x;
                nodeVertices[v++] = nodes[i].position.y;
                nodeVertices[v++] = nodes[i++].position.z;
            }

            nodeGeometry.addAttribute("position", new THREE.BufferAttribute( nodeVertices, 3));

            return nodeGeometry;
        }

        buildLineGeometry(connections)
        {
            let lineGeometry = new THREE.BufferGeometry();
            let lineVertices = new Float32Array(connections.length * 3 * 2);
            let i = 0;
            let v = 0;
            while (i < connections.length)
            {
                lineVertices[v++] = connections[i].nodeA.position.x;
                lineVertices[v++] = connections[i].nodeA.position.y;
                lineVertices[v++] = connections[i].nodeA.position.z;

                lineVertices[v++] = connections[i].nodeB.position.x;
                lineVertices[v++] = connections[i].nodeB.position.y;
                lineVertices[v++] = connections[i++].nodeB.position.z;
            }

            lineGeometry.addAttribute("position", new THREE.BufferAttribute( lineVertices, 3));

            return lineGeometry;
        }

        buildFaceGeometry(faces)
        {
            let faceGeometry = new THREE.BufferGeometry();
            let vertices = new Float32Array(faces.length * 3 * 6);
            let indices = new Uint16Array(faces.length * 6);
            let faceIndex = 0;
            let floatIndex = 0;
            let indexIndex = 0;
            let vertexIndex = 0;
            while (faceIndex < faces.length)
            {
                indexIndex = faceIndex * 6;
                vertexIndex = faceIndex * 4;
                vertices[floatIndex++] = faces[faceIndex].nodeA.position.x;
                vertices[floatIndex++] = faces[faceIndex].nodeA.position.y;
                vertices[floatIndex++] = faces[faceIndex].nodeA.position.z;

                vertices[floatIndex++] = faces[faceIndex].nodeB.position.x;
                vertices[floatIndex++] = faces[faceIndex].nodeB.position.y;
                vertices[floatIndex++] = faces[faceIndex].nodeB.position.z;

                vertices[floatIndex++] = faces[faceIndex].nodeC.position.x;
                vertices[floatIndex++] = faces[faceIndex].nodeC.position.y;
                vertices[floatIndex++] = faces[faceIndex].nodeC.position.z;

                
                vertices[floatIndex++] = faces[faceIndex].nodeA.position.x;
                vertices[floatIndex++] = faces[faceIndex].nodeA.position.y;
                vertices[floatIndex++] = faces[faceIndex].nodeA.position.z;

                vertices[floatIndex++] = faces[faceIndex].nodeC.position.x;
                vertices[floatIndex++] = faces[faceIndex].nodeC.position.y;
                vertices[floatIndex++] = faces[faceIndex].nodeC.position.z;

                vertices[floatIndex++] = faces[faceIndex].nodeD.position.x;
                vertices[floatIndex++] = faces[faceIndex].nodeD.position.y;
                vertices[floatIndex++] = faces[faceIndex++].nodeD.position.z;
            }

            faceGeometry.addAttribute("position", new THREE.BufferAttribute( vertices, 3));
            faceGeometry.computeVertexNormals();

            return faceGeometry;
        }
    }

    class Node
    {
        constructor(x, y, z)
        {
            x = x || 0;
            y = y || 0;
            z = z || 0;
            this.position = new THREE.Vector3(x, y, z);
            this.lines = [];
        }
    }

    class Line
    {
        constructor(n1, n2)
        {
            this.nodeA = n1;
            this.nodeB = n2;
        }
    }

    class Face
    {
        constructor(n1, n2, n3, n4)
        {
            this.nodeA = n1;
            this.nodeB = n2;
            this.nodeC = n3;
            this.nodeD = n4;
        }
    }

    class ShaderCollection
    {
        constructor()
        {
            this.files = {};
            this.shaders = {};
        }

        get(name)
        {
            return this.shaders[name];
        }

        loadFromFiles(...files)
        {
            return Promise.all(files.map(LoadFile)).then((content) => {
                let i = -1;
                let file = null;
                while (file = files[++i])
                {
                    this.files[file] = content[i];
                }

                for (let name in this.files)
                {
                    let file = this.files[name];
                    this.shaders[name] = this.preProcessShader(file);
                }
            });
        }

        preProcessShader(shader)
        {
            return shader.replace(/#include\s+(.*)/, (match, file) => {
                let imported = this.files[file];
                if (typeof (imported) !== "undefined")
                    return "//Content fetched from " + file + "\n" + imported + "\n//END OF IMPORT/n";
                return "//Failure to import content from " + file + " was the file loaded?";
            });
        }
    }

    window.addEventListener("load", main);
})();
