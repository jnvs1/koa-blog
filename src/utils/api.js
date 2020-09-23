const createJSON = ({data={}, success=true, msg='请求成功'}) => {
  return {
    data,
    success,
    msg
  }
}

const version = 'v1'

module.exports = createJSON
