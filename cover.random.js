

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
            this.shaders = {
                points: {vert: null, frag: null},
                lines: {vert: null, frag: null}
            };
            this.renderEnabled = true;

            this.renderer = new THREE.WebGLRenderer({antialias: true});
            this.renderer.setSize(coverElement.clientWidth, coverElement.clientHeight);
            coverElement.appendChild(this.renderer.domElement);

            this.scene = new THREE.Scene();
            this.camera = new THREE.OrthographicCamera(-0.5, 0.5, -0.5, 0.5, 1, 1000);
            this.camera.position.z = 10;
            this.scene.add(this.camera);
        }

        start()
        {
            let network = new Network(50, this);
            this.scene.add(network.pointMesh);
            this.scene.add(network.lineMesh);
            this.render();
        }

        loadShaderPrograms()
        {
            return Promise.all([
                LoadFile("network.points.vert"), 
                LoadFile("network.points.frag"),
                LoadFile("network.lines.vert"), 
                LoadFile("network.lines.frag")
            ]).then((shaders) => {
                this.shaders.points.vert = shaders[0];
                this.shaders.points.frag = shaders[1];
                this.shaders.lines.vert = shaders[2];
                this.shaders.lines.frag = shaders[3];
                return null;
            });
        }

        render()
        {
            if (this.renderEnabled)
            {
                requestAnimationFrame(() => this.render());

                this.renderer.render(this.scene, this.camera);
            }
        }
    }

    class Network
    {
        constructor(points, program)
        {
            points = points || 10;
            this.program = program;
            this.nodes = [];
            this.connections = [];
            this.nodePointGeometry = null;
            this.nodeLineGeometry = null;
            
            for (let i = 0; i < points; i++)
            {
                let y = Math.random();
                y = 1 - Math.pow(y, 2);
                this.nodes.push(new Node(Math.random() - 0.5, y - 0.5, 0.1));
            }

            this.nodes.forEach((nodeA) => {
                let nodeB = nodeA;
                let distance = 1.0;
                while (nodeB === nodeA && distance > 0.1)
                {
                    nodeB = this.nodes[Math.floor(Math.random() * this.nodes.length)];
                    distance = (new THREE.Vector2(nodeA.position.x - nodeB.position.x, nodeA.position.y - nodeB.position.y)).length();
                }

                nodeA.position.z += 0.1;
                nodeB.position.z += 0.1;
                this.connections.push(new Connection(nodeA, nodeB));
            });

            this.nodePointGeometry = this.buildPointGeometry(this.nodes);
            this.pointMaterial = new THREE.ShaderMaterial({
                vertexShader: this.program.shaders.points.vert,
                fragmentShader: this.program.shaders.points.frag,
                transparent: true, 
                blending: THREE.AdditiveBlending,
                depthTest: false
            });
            this.pointMesh = new THREE.Points(this.nodePointGeometry, this.pointMaterial);

            this.nodeLineGeometry = this.buildLineGeometry(this.connections);
            this.LineMaterial = new THREE.ShaderMaterial({
                vertexShader: this.program.shaders.lines.vert,
                fragmentShader: this.program.shaders.lines.frag,
                transparent: true, 
                blending: THREE.AdditiveBlending,
                depthTest: false
            });
            this.lineMesh = new THREE.LineSegments(this.nodeLineGeometry, this.LineMaterial);
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
    }

    class Node
    {
        constructor(x, y, z)
        {
            x = x || 0;
            y = y || 0;
            z = z || 0;
            this.position = new THREE.Vector3(x, y, z);
            this.connections = [];
        }
    }

    class Connection
    {
        constructor(n1, n2)
        {
            this.nodeA = n1;
            this.nodeB = n2;
            this.connected = false;
        }
    }

    window.addEventListener("load", main);
})();
