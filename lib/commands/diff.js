exports.yargs = {
    command: 'diff <fileA> <fileB>',
    describe: 'Perform a diff between two recon files',
    aliases: ['d'],

    builder: (yargs) => {
        yargs.option('subset', {
            alias: 's',
            choices: ['left', 'right', 'both'],
            default: 'left',
            describe: 'The subset to select'
        })

        const { installWriteOptions } = require('./utils/file')

        installWriteOptions(yargs)

        const { installOutputOptions } = require('./utils/output')

        installOutputOptions(yargs)
    },

    handler: async(argv) => {
        const { Scout } = require('../scout')

        const fs = require('fs')
        const util = require('util')

        const readFile = util.promisify(fs.readFile.bind(fs))

        const { fileA, fileB, subset } = argv

        let fileAData

        try {
            fileAData = await readFile(fileA)
        }
        catch (e) {
            console.error(`Cannot read file ${fileA}`)

            return
        }

        let fileAJSON

        try {
            fileAJSON = JSON.parse(fileAData.toString())
        }
        catch (e) {
            console.error(`Cannot unpack file ${fileA}`)

            return
        }

        const scoutA = new Scout()

        try {
            scoutA.load(fileAJSON)
        }
        catch (e) {
            console.error(`Cannot load file ${fileA}`)

            return
        }

        let fileBData

        try {
            fileBData = await readFile(fileB)
        }
        catch (e) {
            console.error(`Cannot read file ${fileB}`)

            return
        }

        let fileBJSON

        try {
            fileBJSON = JSON.parse(fileBData.toString())
        }
        catch (e) {
            console.error(`Cannot parse file ${fileB}`)

            return
        }

        const scoutB = new Scout()

        try {
            scoutB.load(fileBJSON)
        }
        catch (e) {
            console.error(`Cannot load file ${fileB}`)

            return
        }

        const {
            [subset]: collection
        } = scoutA.collectionNodes.diff(scoutB.collectionNodes)

        const nodes = collection.map(node => node.data())

        const { handleOutputOptions } = require('./utils/output')

        await handleOutputOptions(argv, nodes)

        const { handleWriteOptions } = require('./utils/file')

        const scout = new Scout()

        scout.addCollection(collection)

        await handleWriteOptions(argv, scout)
    }
}
