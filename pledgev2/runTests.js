const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 测试目录路径
const testDir = path.join(__dirname, 'test');

// 要排除的测试文件
const excludeFiles = ['MinimalRefundBorrowTest.js', 'SimplifiedRefundBorrowTest.js'];

// 获取所有测试文件
const testFiles = fs.readdirSync(testDir)
  .filter(file => 
    file.endsWith('.js') && 
    !excludeFiles.includes(file) && 
    !file.startsWith('helper')
  )
  .map(file => path.join('test', file));

console.log('要运行的测试文件:');
console.log(testFiles);
console.log('\n开始运行测试...\n');

// 运行所有测试文件
let allPassed = true;
for (const file of testFiles) {
  console.log(`\n=== 运行测试文件: ${file} ===`);
  try {
    const output = execSync(`npx hardhat test ${file}`, {
      encoding: 'utf-8',
      cwd: __dirname
    });
    console.log(output);
  } catch (error) {
    console.error(`测试文件 ${file} 失败:`);
    console.error(error.stdout);
    allPassed = false;
  }
}

console.log('\n=== 测试结果摘要 ===');
if (allPassed) {
  console.log('所有测试通过！');
} else {
  console.log('部分测试失败。');
}