const cytoscape = require('cytoscape')
const { EventEmitter } = require('events')

// WARNING: The API for Scout is pretty much unstable and very early stage.

class Scout extends EventEmitter {
    constructor() {
        super()

        this.cy = cytoscape({
            headless: true
        })

        this.transformers = {}
    }

    registerTransform(name, transform) {
        this.transformers[name.toLowerCase()] = transform
    }

    registerTransforms(transforms) {
        Object.entries(transforms).forEach(([name, value]) => {
            this.registerTransform(name, value)
        })
    }

    get collectionNodes() {
        return this.cy.nodes()
    }

    addCollection(collection) {
        this.cy.add(collection)
    }

    selectCollection(expression) {
        return this.cy.nodes(expression)
    }

    addNode(node) {
        const { edges = [], ...data } = node

        try {
            this.cy.add({
                group: 'nodes',
                data: data
            })
        }
        catch (e) {
            this.emit('error', e)
        }

        edges.forEach((target) => {
            const source = data.id

            try {
                this.cy.add({
                    group: 'edges',
                    data: {
                        id: `edge:${source}:${target}`,
                        source: source,
                        target: target
                    }
                })
            }
            catch (e) {
                this.emit('error', e)
            }
        })
    }

    addStringNode(string) {
        this.addNode({ id: `string:${string}`, type: 'string', label: string, props: { string } })
    }

    save() {
        return this.cy.json()
    }

    load(input) {
        this.cy.json(input)
    }

    extractCollection(collection) {
        return collection.map((node) => {
            return node.data()
        })
    }

    async transformCollection(collection, transformation, options = {}, property) {
        transformation = transformation.toLowerCase()

        const transformer = new this.transformers[transformation]()

        transformer.on('info', this.emit.bind(this, 'info'))
        transformer.on('warn', this.emit.bind(this, 'warn'))
        transformer.on('error', this.emit.bind(this, 'error'))

        if (!transformer) {
            throw new Error(`Unknown transformation ${transformation}`)
        }

        let nodes = this.extractCollection(collection)

        if (property) {
            // NOTE: terrible idea

            nodes = nodes.map(({ props, ...rest }) => ({ ...rest, label: props[property] || '', props }))
        }

        const results = await transformer.run(nodes, options)

        results.forEach((node) => {
            this.addNode(node)
        })

        return results
    }

    async transform(transformation, options = {}, property) {
        return this.transformCollection(this.cy.nodes(), transformation, options, property)
    }
}

module.exports = { Scout }
