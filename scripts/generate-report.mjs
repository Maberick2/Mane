import fs from 'fs';  
import path from 'path';  
import { fileURLToPath } from 'url';  
import { JSDOM } from 'jsdom';  
import { exec } from 'child_process';  

const __filename = fileURLToPath(import.meta.url);  
const __dirname = path.dirname(__filename);  

const { DOMParser } = new JSDOM().window;  

function parseJUnitXml(xmlContent) {  
  console.log('Iniciando parseo de XML...');  
  const parser = new DOMParser();  
  const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');  
  const testsuites = xmlDoc.getElementsByTagName('testsuite');  
  console.log('Número de test suites encontradas:', testsuites.length);  

  let results = {  
    total: 0,  
    failures: 0,  
    time: 0,  
    groupedTests: {  
      unit: [],  
      integration: [],  
      security: [],  
      system: []  
    }  
  };  

  for (let suite of testsuites) {  
    const testcases = suite.getElementsByTagName('testcase');  

    for (let test of testcases) {  
      const testName = test.getAttribute('name');  
      const className = test.getAttribute('classname');  
      const time = parseFloat(test.getAttribute('time'));  
      const failure = test.getElementsByTagName('failure')[0];  

      const testData = {  
        name: testName,  
        className: className,  
        time: time,  
        failed: !!failure,  
        failureMessage: failure ? failure.textContent : null  
      };  

      // Clasificación basada en el nombre de la clase y descripción  
      if (className.toLowerCase().includes('security') || testName.toLowerCase().includes('security')) {  
        results.groupedTests.security.push(testData);  
      } else if (className.toLowerCase().includes('integration') || testName.toLowerCase().includes('docker authentication integration')) {  
        results.groupedTests.integration.push(testData);  
      } else if (className.toLowerCase().includes('system') || testName.toLowerCase().includes('system')) {  
        results.groupedTests.system.push(testData);  
      } else if (className.toLowerCase().includes('auth') || testName.toLowerCase().includes('authentication edge cases')) {  
        results.groupedTests.unit.push(testData);  
      }  

      results.total++;  
      if (failure) results.failures++;  
      results.time += time;  
    }  
  }  

  return results;  
}  

function generateCoverageSection() {  
  try {  
    const coverageData = JSON.parse(  
      fs.readFileSync(path.join(__dirname, '..', 'coverage', 'coverage-summary.json'), 'utf8')  
    );  
    const total = coverageData.total;  

    return `  
        <div class="bg-white rounded-lg shadow p-6 mb-8">  
            <h2 class="text-xl font-semibold mb-4 text-gray-700">📊 Informe de cobertura</h2>  
            <div class="space-y-4">  
                ${generateCoverageBar('Líneas', total.lines.pct, 'blue')}  
                ${generateCoverageBar('Funciones', total.functions.pct, 'green')}  
                ${generateCoverageBar('Ramas', total.branches.pct, 'yellow')}  
                ${generateCoverageBar('Declaraciones', total.statements.pct, 'indigo')}  
            </div>  
        </div>`;  
  } catch (error) {  
    console.error('Error al generar sección de cobertura:', error);  
    return '<div class="bg-red-50 p-4 rounded-lg">Error al generar informe de cobertura</div>';  
  }  
}  

function generateCoverageBar(label, percentage, color) {  
  const thresholdColor = percentage < 70 ? 'red' : percentage < 80 ? 'yellow' : 'green';  
  return `  
    <div>  
        <div class="flex justify-between mb-1">  
            <span class="text-sm font-medium text-gray-700">${label}</span>  
            <span class="text-sm font-medium text-${thresholdColor}-600">${percentage.toFixed(2)}%</span>  
        </div>  
        <div class="w-full bg-gray-200 rounded-full h-2.5">  
            <div class="bg-${color}-600 h-2.5 rounded-full" style="width: ${percentage}%"></div>  
        </div>  
    </div>`;  
}  

function generateTestSection(tests, title) {  
  if (!tests || tests.length === 0) return '';  

  const icons = {  
    'Pruebas Unitarias': '🧪',  
    'Pruebas de Integración': '🔄',  
    'Pruebas de Seguridad': '🔒',  
    'Pruebas de Sistema': '🖥️'  
  };  

  const icon = Object.entries(icons).find(([key]) => title.includes(key))?.[1] || '📋';  
  const passedTests = tests.filter(t => !t.failed).length;  
  const failedTests = tests.filter(t => t.failed).length;  
  const totalTime = tests.reduce((acc, test) => acc + test.time, 0);  

  return `  
    <div class="mb-8">  
      <div class="bg-white shadow overflow-hidden sm:rounded-lg">  
        <div class="px-4 py-5 border-b border-gray-200 sm:px-6">  
          <h3 class="text-lg leading-6 font-medium text-gray-900">  
            ${icon} ${title}  
          </h3>  
          <div class="mt-2 grid grid-cols-3 gap-4">  
            <div class="bg-green-50 p-3 rounded-lg">  
              <span class="text-green-700 font-semibold">${passedTests}</span>  
              <span class="text-green-600"> Pruebas exitosas</span>  
            </div>  
            <div class="bg-red-50 p-3 rounded-lg">  
              <span class="text-red-700 font-semibold">${failedTests}</span>  
              <span class="text-red-600"> Pruebas fallidas</span>  
            </div>  
            <div class="bg-blue-50 p-3 rounded-lg">  
              <span class="text-blue-700 font-semibold">${totalTime.toFixed(2)}s</span>  
              <span class="text-blue-600"> Tiempo total</span>  
            </div>  
          </div>  
        </div>  
        <div class="overflow-x-auto">  
          <table class="min-w-full divide-y divide-gray-200">  
            <thead class="bg-gray-50">  
              <tr>  
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">  
                  Nombre de la prueba  
                </th>  
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">  
                  Clase  
                </th>  
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">  
                  Estado  
                </th>  
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">  
                  Tiempo  
                </th>  
              </tr>  
            </thead>  
            <tbody class="bg-white divide-y divide-gray-200">  
              ${tests.map(test => generateTestRow(test)).join('')}  
            </tbody>  
          </table>  
        </div>  
      </div>  
    </div>`;  
}  

function generateTestRow(test) {  
  return `  
    <tr class="${test.failed ? 'bg-red-50' : 'hover:bg-gray-50'}">  
      <td class="px-6 py-4 whitespace-normal text-sm text-gray-900">  
        ${test.name}  
        ${test.failed  
          ? `  
          <div class="mt-1 text-xs text-red-600 break-words">  
            ${test.failureMessage}  
          </div>`  
          : ''}  
      </td>  
      <td class="px-6 py-4 whitespace-normal text-sm text-gray-500">  
        ${test.className}  
      </td>  
      <td class="px-6 py-4 whitespace-nowrap text-sm">  
        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${  
          test.failed ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'  
        }">  
          ${test.failed ? 'Fallido' : 'Exitoso'}  
        </span>  
      </td>  
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">  
        ${test.time.toFixed(3)}s  
      </td>  
    </tr>`;  
}  

function generateHtmlReport() {  
  try {  
    const junitContent = fs.readFileSync(  
      path.join(__dirname, '..', 'junit.xml'),  
      'utf8'  
    );  
    const results = parseJUnitXml(junitContent);  
    const timestamp = new Date().toLocaleString();  

    const html = `  
<!DOCTYPE html>  
<html lang="es">  
<head>  
    <meta charset="UTF-8">  
    <meta name="viewport" content="width=device-width, initial-scale=1.0">  
    <title>Reporte de Pruebas - ${timestamp}</title>  
    <script src="https://cdn.tailwindcss.com"></script>  
</head>  
<body class="bg-gray-100 p-8">  
    <div class="max-w-7xl mx-auto">  
        <div class="flex justify-between items-center mb-8">  
            <h1 class="text-3xl font-bold text-gray-800">Reporte de Pruebas</h1>  
            <span class="text-sm text-gray-500">${timestamp}</span>  
        </div>  
        
        <!-- Resumen General -->  
        <div class="bg-white rounded-lg shadow p-6 mb-8">  
            <h2 class="text-xl font-semibold mb-4 text-gray-700">📊 Resumen General</h2>  
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">  
                <div class="bg-blue-50 p-4 rounded-lg">  
                    <div class="text-2xl font-bold text-blue-600">${results.total}</div>  
                    <div class="text-sm text-blue-600">Pruebas Totales</div>  
                </div>  
                <div class="bg-green-50 p-4 rounded-lg">  
                    <div class="text-2xl font-bold text-green-600">${results.total - results.failures}</div>  
                    <div class="text-sm text-green-600">Pruebas Exitosas</div>  
                </div>  
                <div class="bg-red-50 p-4 rounded-lg">  
                    <div class="text-2xl font-bold text-red-600">${results.failures}</div>  
                    <div class="text-sm text-red-600">Pruebas Fallidas</div>  
                </div>  
                <div class="bg-yellow-50 p-4 rounded-lg">  
                    <div class="text-2xl font-bold text-yellow-600">${results.time.toFixed(2)}s</div>  
                    <div class="text-sm text-yellow-600">Tiempo Total</div>  
                </div>  
            </div>  
        </div>  

        <!-- Sección de Cobertura -->  
        ${generateCoverageSection()}  

        <!-- Secciones de pruebas -->  
        ${generateTestSection(results.groupedTests.unit, 'Pruebas Unitarias (Authentication Edge Cases)')}  
        ${generateTestSection(results.groupedTests.integration, 'Pruebas de Integración (Docker Authentication)')}  
        ${generateTestSection(results.groupedTests.security, 'Pruebas de Seguridad (Authentication Security)')}  
        ${generateTestSection(results.groupedTests.system, 'Pruebas de Sistema (Docker Login System)')}  
    </div>  
</body>  
</html>`;  

    // Asegurarse de que el directorio reports existe  
    const reportsDir = path.join(__dirname, '..', 'reports');  
    if (!fs.existsSync(reportsDir)) {  
      fs.mkdirSync(reportsDir);  
    }  

    const reportPath = path.join(reportsDir, 'test-report.html');  
    fs.writeFileSync(reportPath, html);  
    console.log(`Reporte generado: ${reportPath}`);  

    // Abrir el reporte en el navegador predeterminado  
    const start =  
      process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';  
    exec(`${start} ${reportPath}`);  
  } catch (error) {  
    console.error('Error al generar el reporte:', error);  
    process.exit(1);  
  }  
}  

// Ejecutar la generación del reporte  
generateHtmlReport();