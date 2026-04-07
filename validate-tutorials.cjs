#!/usr/bin/env node

/**
 * Tutorial System Validation Script
 * 
 * This script validates that all tutorial steps have valid selectors
 * and that the referenced data-tour attributes exist in the codebase.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SRC_DIR = path.join(process.cwd(), 'frontend-react', 'src');
const TOUR_TARGETS_FILE = path.join(SRC_DIR, 'tour', 'tourTargets.ts');
const TOUR_REGISTRY_FILE = path.join(SRC_DIR, 'tour', 'tourRegistry.ts');

// Helper functions
function extractTourTargets() {
  const content = fs.readFileSync(TOUR_TARGETS_FILE, 'utf-8');
  const targets = new Map();
  
  // Extract TOUR_TARGETS definitions
  const targetMatches = content.matchAll(/(\w+):\s*['"]([^'"]+)['"]/g);
  for (const match of targetMatches) {
    const key = match[1];
    const value = match[2];
    
    // Build nested path
    const pathParts = value.split('.');
    const fullPath = `data-tour="${value}"`;
    targets.set(fullPath, pathParts.join('.'));
  }
  
  return targets;
}

function extractTourSteps() {
  const content = fs.readFileSync(TOUR_REGISTRY_FILE, 'utf-8');
  const steps = [];
  
  // Extract tour modules and their steps
  const tourMatches = content.matchAll(/const\s+(\w+Module):\s*TourModule\s*=\s*{[^}]*tour:\s*{[^}]*steps:\s*(\[[\s\S]*?\])/g);
  
  for (const match of tourMatches) {
    const moduleName = match[1];
    const stepsArray = match[2];
    
    try {
      // Parse the steps array (this is simplified - in real implementation would need proper parsing)
      const stepMatches = stepsArray.matchAll(/{[^}]*id:\s*['"]([^'"]+)['"][^}]*}/g);
      
      for (const stepMatch of stepMatches) {
        const stepId = stepMatch[1];
        
        // Extract selector
        const selectorMatch = stepMatch[0].match(/selector:\s*tourSel\([^)]+\)/);
        const selector = selectorMatch ? selectorMatch[0] : '';
        
        // Extract waitFor
        const waitForMatch = stepMatch[0].match(/waitFor:\s*tourSel\([^)]+\)/);
        const waitFor = waitForMatch ? waitForMatch[0] : '';
        
        // Extract route
        const routeMatch = stepMatch[0].match(/route:\s*['"]([^'"]+)['"]/);
        const route = routeMatch ? routeMatch[1] : '';
        
        // Extract optional
        const optionalMatch = stepMatch[0].match(/optional:\s*(true|false)/);
        const optional = optionalMatch ? optionalMatch[1] === 'true' : false;
        
        steps.push({
          tutorialId: moduleName,
          stepId,
          selector,
          waitFor,
          route,
          optional
        });
      }
    } catch (error) {
      console.warn(`Could not parse steps for ${moduleName}:`, error);
    }
  }
  
  return steps;
}

function findDataTourAttributes() {
  const dataTourMap = new Map();
  
  function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const matches = content.matchAll(/data-tour="([^"]+)"/g);
          
          for (const match of matches) {
            const tourId = match[1];
            if (!dataTourMap.has(tourId)) {
              dataTourMap.set(tourId, []);
            }
            dataTourMap.get(tourId).push(fullPath);
          }
        } catch (error) {
          console.warn(`Could not read file ${fullPath}:`, error);
        }
      }
    }
  }
  
  scanDirectory(SRC_DIR);
  return dataTourMap;
}

function validateSteps() {
  console.log('🔍 Extracting tour targets...');
  const tourTargets = extractTourTargets();
  
  console.log('📋 Extracting tour steps...');
  const tourSteps = extractTourSteps();
  
  console.log('🔍 Finding data-tour attributes in codebase...');
  const dataTourAttributes = findDataTourAttributes();
  
  console.log('✅ Validating steps...');
  const results = [];
  
  // Group steps by tutorial
  const stepsByTutorial = new Map();
  for (const step of tourSteps) {
    if (!stepsByTutorial.has(step.tutorialId)) {
      stepsByTutorial.set(step.tutorialId, []);
    }
    stepsByTutorial.get(step.tutorialId).push(step);
  }
  
  for (const [tutorialId, steps] of stepsByTutorial) {
    const result = {
      tutorialId,
      tutorialTitle: tutorialId.replace(/Module$/, ''),
      steps: [],
      status: 'PASS',
      errors: [],
      warnings: []
    };
    
    for (const step of steps) {
      const stepValidation = {
        stepId: step.stepId,
        selector: step.selector,
        waitFor: step.waitFor,
        route: step.route,
        optional: step.optional,
        status: 'PASS',
        issues: []
      };
      
      // Validate selector
      if (step.selector) {
        const selectorValue = step.selector.replace(/tourSel\(|\)/g, '').replace(/['"]/g, '');
        const dataTourValue = `data-tour="${selectorValue}"`;
        
        if (!dataTourAttributes.has(selectorValue)) {
          stepValidation.status = 'FAIL';
          stepValidation.issues.push(`Selector ${dataTourValue} not found in any component`);
          result.status = 'FAIL';
          result.errors.push(`Step ${step.stepId}: Selector ${dataTourValue} not found`);
        }
      }
      
      // Validate waitFor
      if (step.waitFor) {
        const waitForValue = step.waitFor.replace(/tourSel\(|\)/g, '').replace(/['"]/g, '');
        const dataTourValue = `data-tour="${waitForValue}"`;
        
        if (!dataTourAttributes.has(waitForValue)) {
          stepValidation.status = 'WARNING';
          stepValidation.issues.push(`WaitFor ${dataTourValue} not found in any component`);
          result.status = 'WARNING';
          result.warnings.push(`Step ${step.stepId}: WaitFor ${dataTourValue} not found`);
        }
      }
      
      result.steps.push(stepValidation);
    }
    
    results.push(result);
  }
  
  return results;
}

function generateReport(results) {
  console.log('\n📊 TUTORIAL VALIDATION REPORT\n');
  console.log('================================\n');
  
  const totalTutorials = results.length;
  const passedTutorials = results.filter(r => r.status === 'PASS').length;
  const failedTutorials = results.filter(r => r.status === 'FAIL').length;
  const warningTutorials = results.filter(r => r.status === 'WARNING').length;
  
  console.log(`Summary: ${passedTutorials}/${totalTutorials} passed, ${failedTutorials} failed, ${warningTutorials} with warnings\n`);
  
  // Detailed results
  for (const result of results) {
    console.log(`📚 ${result.tutorialTitle} (${result.tutorialId})`);
    console.log(`   Status: ${result.status}`);
    
    if (result.errors.length > 0) {
      console.log('   ❌ Errors:');
      result.errors.forEach(error => console.log(`      - ${error}`));
    }
    
    if (result.warnings.length > 0) {
      console.log('   ⚠️  Warnings:');
      result.warnings.forEach(warning => console.log(`      - ${warning}`));
    }
    
    if (result.errors.length === 0 && result.warnings.length === 0) {
      console.log('   ✅ All steps validated successfully');
    }
    
    console.log('');
  }
  
  // Statistics
  const totalSteps = results.reduce((sum, r) => sum + r.steps.length, 0);
  const passedSteps = results.reduce((sum, r) => sum + r.steps.filter(s => s.status === 'PASS').length, 0);
  const failedSteps = results.reduce((sum, r) => sum + r.steps.filter(s => s.status === 'FAIL').length, 0);
  const warningSteps = results.reduce((sum, r) => sum + r.steps.filter(s => s.status === 'WARNING').length, 0);
  
  console.log('📈 STATISTICS');
  console.log('============');
  console.log(`Total Steps: ${totalSteps}`);
  console.log(`Passed: ${passedSteps} (${((passedSteps/totalSteps)*100).toFixed(1)}%)`);
  console.log(`Failed: ${failedSteps} (${((failedSteps/totalSteps)*100).toFixed(1)}%)`);
  console.log(`Warnings: ${warningSteps} (${((warningSteps/totalSteps)*100).toFixed(1)}%)`);
  
  if (failedTutorials > 0) {
    console.log('\n❌ VALIDATION FAILED - Fix issues before proceeding');
    process.exit(1);
  } else if (warningTutorials > 0) {
    console.log('\n⚠️  VALIDATION PASSED WITH WARNINGS - Review warnings');
  } else {
    console.log('\n✅ VALIDATION PASSED - All tutorials are ready');
  }
}

// Main execution
function main() {
  console.log('🚀 Starting Tutorial System Validation...\n');
  
  try {
    const results = validateSteps();
    generateReport(results);
  } catch (error) {
    console.error('❌ Validation failed with error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { validateSteps, generateReport };
