import fs from 'fs'
import path from 'path'
import swaggerTools from 'swagger-tools'
import YAML from 'yamljs'
import _ from 'lodash'
import ejs from 'ejs'

// The Swagger document (require it, build it programmatically, fetch it from a URL, ...)
const swaggerDoc = YAML.load(path.join(__dirname, '../config/swagger.yaml'))

function getControllers() {
  return new Promise((resolve) => {
    fs.readdir(path.join(__dirname, 'controllers'), (err, files) => {
      const controllerModuleFiles = _.filter(files, (file) => file.match(/\.js$/))
      resolve(_.zipObject(_.map(controllerModuleFiles, (file) => {
        const controllerName = file.replace(/\.js$/, '')
        const controllerFunc = require(`./controllers/${controllerName}`)
        return [controllerName, controllerFunc]
      })))
    })
  })
}

// Customize the look-and-feel of the Swagger docs.
export function replaceSwaggerUiHtml(iconsMetadataTagsHtml) {
  const title = 'icons API'
  const logoUrl = 'https://lg-icons.herokuapp.com/favicon-32x32.png'
  const customSwaggerUiTemplateFilename = path.join(__dirname, '..', 'public', 'templates', 'swagger-docs.html.ejs')
  const swaggerUiHtmlFilename = path.join(__dirname, '..', 'node_modules', 'swagger-tools', 'middleware', 'swagger-ui', 'index.html')

  const templateData = fs.readFileSync(customSwaggerUiTemplateFilename).toString('utf-8')
  const renderedTemplate = ejs.render(templateData, { title, logoUrl, iconsMetadataTagsHtml })
  fs.writeFileSync(swaggerUiHtmlFilename, renderedTemplate.toString())
}


export default function configureSwagger(app, next) {
  // Initialize the Swagger middleware
  swaggerTools.initializeMiddleware(swaggerDoc, (middleware) => {
    // Interpret Swagger resources and attach metadata to request - must be first in swagger-tools middleware chain
    app.use(middleware.swaggerMetadata())

    // Validate Swagger requests
    app.use(middleware.swaggerValidator())

    // Route validated requests to appropriate controller
    getControllers().then((controllers) => app.use(middleware.swaggerRouter({ controllers })))

    // Serve the Swagger documents and Swagger UI
    app.use(middleware.swaggerUi())

    // Start the server
    return next()
  })
}
